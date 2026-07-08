import Address from "../models/Address";
// save address
export const saveAddress = async (req, res) => {
  try {
    const address = await Address.create(req.body);
    res.status(200).json({ message: "address save succefully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// get address by user id
export const getAddresses = async (req, res) => {
  try {
    const addressess = await Address.find({
      userId: req.params.userId,
    });
    res.status(200).json(addressess);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
