import clientPromise from "../../config/db/mongodb";

export async function guardarTelefonoUsuario(
  email: string,
  telefono: string
) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("ServineoBD");

  await db.collection("users").updateOne(
    { email },
    {
      $set: {
        telefono: telefono,
        updatedAt: new Date(),
      },
    }
  );

  console.log(`✅ Teléfono guardado para ${email}: ${telefono}`);
}

// Verificar si el teléfono ya existe
export async function verificarTelefonoDuplicado(
  telefono: string,
  emailActual: string
): Promise<boolean> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("ServineoBD");

  const usuarioConTelefono = await db.collection("users").findOne({
    telefono: telefono,
    email: { $ne: emailActual } 
  });

  return usuarioConTelefono !== null;
}