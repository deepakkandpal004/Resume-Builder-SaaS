// ImageKit configuration
// Note: The @imagekit/nodejs SDK v7+ has a different API.
// For server-side uploads, we'll use the REST API directly or the older SDK approach.

export function getImageKitConfig() {
  return {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/deepakkandpal",
  };
}

export default getImageKitConfig;
