import UsageCounter from "../models/UsageCounter";

export const utcDay = () => new Date().toISOString().slice(0, 10);

export const claimQuota = async (userId: string, feature: string) => {
  const day = utcDay();
  const doc = await UsageCounter.findOneAndUpdate(
    { userId, feature, day },
    { $inc: { count: 1 }, $setOnInsert: { userId, feature, day } },
    { upsert: true, new: true, select: "count" }
  );
  return doc.count;
};

export const refundQuota = async (userId: string, feature: string) => {
  const day = utcDay();
  await UsageCounter.updateOne(
    { userId, feature, day, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  );
};
