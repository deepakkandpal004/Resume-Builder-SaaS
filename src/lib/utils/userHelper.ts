import User from "../models/User";

export const getMongoUserId = async (firebaseUid: string) => {
  const user = await User.findOne({ firebaseUid }).select("_id");
  return user?._id;
};

export const getMongoUser = async (firebaseUid: string) => {
  return User.findOne({ firebaseUid });
};
