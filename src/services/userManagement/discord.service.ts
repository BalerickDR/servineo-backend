import fetch from "node-fetch";
import clientPromise from "../../config/db/mongodb";
import { ObjectId } from "mongodb";
import { IUser } from "../../models/requester.model";

interface DiscordUser {
  email: string;
  name: string;
  picture?: string;
  discordId: string;
}


export async function verifyDiscordToken(token: string): Promise<DiscordUser | null> {
  // aquí 'token' es el accessToken de Discord
  return await getDiscordUser(token);
}

 //Obtener datos del usuario desde Discord API
export async function getDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  const resp = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await resp.json();
  if (!data || !data.id) return null;

  const email = data.email || `${data.id}@discord.local`;

  return {
    discordId: data.id,
    email,
    name: data.username,
    picture: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : "",
  };
}


 //Buscar usuario 

export async function findUserByDiscordId(
  discordIdOrEmailOrUserId: string
): Promise<IUser & { _id: ObjectId } | null> {
  
  const mongoClient = await clientPromise;
  const db = mongoClient.db("ServineoBD");

  let user: IUser | null = null;

  // 1. Buscar por Discord ID o email dentro de authProviders
  user = await db.collection<IUser>("users").findOne({
    "authProviders.provider": "discord",
    $or: [
      { "authProviders.providerId": discordIdOrEmailOrUserId },
      { email: discordIdOrEmailOrUserId } 
    ],
  });

  if (user) {
    return { ...user, _id: user._id as ObjectId };
  }

  try {
    const objectId = new ObjectId(discordIdOrEmailOrUserId);
    user = await db.collection<IUser>("users").findOne({ _id: objectId });
  } catch (error) {
  }

  if (user) {
    return { ...user, _id: user._id as ObjectId };
  }

  return null;
}


 // Crear usuario
 
export async function createUserDiscord(user: DiscordUser): Promise<IUser & { _id: ObjectId }> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("ServineoBD");

  const newUser: IUser = {
    name: user.name,
    email: user.email,
    url_photo: user.picture || "",
    role: "requester",

    authProviders: [
      {
        provider: "discord",
        providerId: user.discordId, 
        password: "",
      },
    ],

    telefono: "",
    servicios: [],
    ubicacion: {},
    ci: "",
    vehiculo: {},
    acceptTerms: false,
    metodoPago: {},
    experience: {},
    workLocation: {},
  };

  const result = await db.collection<IUser>("users").insertOne(newUser);

  return { ...newUser, _id: result.insertedId };
}


 //Vincular

export async function linkDiscordToUser(userId: ObjectId, discordUser: DiscordUser) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("ServineoBD");

  return db.collection<IUser>("users").updateOne(
    { _id: userId },
    {
      $push: {
        authProviders: {
          provider: "discord",
          providerId: discordUser.discordId, 
          password: "",
        },
      },
    }
  );
}

