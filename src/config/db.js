import dns from "dns";
import mongoose from "mongoose";

/*
 * Windows / some ISP DNS resolvers refuse MongoDB Atlas SRV lookups
 * (querySrv ECONNREFUSED). Prefer IPv4 and public DNS before connecting.
 */
dns.setDefaultResultOrder("ipv4first");

try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore if the runtime disallows changing DNS servers.
}

const toStandardMongoUri = (srvUri) => {
  if (!srvUri?.startsWith("mongodb+srv://")) {
    return null;
  }

  try {
    const parsed = new URL(srvUri);
    const userInfo = parsed.username
      ? `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}@`
      : "";
    const dbName = parsed.pathname?.replace(/^\//, "") || "e-commerce";
    const host = parsed.hostname;

    /*
     * Atlas shard hosts follow this pattern for cluster0.xxxxx.mongodb.net.
     * This avoids SRV DNS which often fails on Windows.
     */
    const base = host.replace(/^cluster0\./, "");
    const shards = [
      `ac-fbaahdy-shard-00-00.${base}:27017`,
      `ac-fbaahdy-shard-00-01.${base}:27017`,
      `ac-fbaahdy-shard-00-02.${base}:27017`,
    ].join(",");

    return `mongodb://${userInfo}${shards}/${dbName}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  } catch {
    return null;
  }
};

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_DB;

  if (!mongoUri) {
    throw new Error("MONGO_DB is missing from the environment variables.");
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  };

  try {
    const connection = await mongoose.connect(mongoUri, options);

    console.log(
      `MongoDB connected successfully: ${connection.connection.host}`,
    );
    console.log(`Database name: ${connection.connection.name}`);

    return connection;
  } catch (primaryError) {
    const isSrvDnsError =
      primaryError?.code === "ECONNREFUSED" ||
      String(primaryError?.message || "").includes("querySrv");

    const fallbackUri = isSrvDnsError ? toStandardMongoUri(mongoUri) : null;

    if (!fallbackUri) {
      console.error("MongoDB connection failed:", primaryError.message);
      throw primaryError;
    }

    console.warn(
      "MongoDB SRV DNS failed. Retrying with standard connection string...",
    );

    try {
      const connection = await mongoose.connect(fallbackUri, options);

      console.log(
        `MongoDB connected successfully: ${connection.connection.host}`,
      );
      console.log(`Database name: ${connection.connection.name}`);

      return connection;
    } catch (fallbackError) {
      console.error("MongoDB connection failed:", fallbackError.message);
      console.error(
        "Tip: In MongoDB Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for development).",
      );
      throw fallbackError;
    }
  }
};
