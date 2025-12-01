import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { generarToken } from "../../../utils/generadorToken";
import { getGitHubUser, findUserByEmail, createUser } from "../../../services/userManagement/github.service";
import clientPromise from "../../../config/db/mongodb";
import { ObjectId } from "mongodb";

export async function githubAuth(req: Request, res: Response) {
  const { code, state } = req.query;

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
  const FRONTEND_URL = process.env.FRONTEND_URL!;

  console.log("==== GitHub OAuth iniciado ====");
  console.log("Parámetros recibidos:", { code, state });

  try {
    if (!code) return res.status(400).send("No code provided");

    let mode = "login";
    let token: string | null = null;

    if (state) {
      try {
        const parsed = JSON.parse(decodeURIComponent(String(state)));
        mode = parsed.mode || "login";
        token = parsed.token || null;
        console.log("State decodificado correctamente:", parsed);
      } catch (e) {
        console.warn("No se pudo parsear el parámetro 'state'");
      }
    }

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("code", String(code));

    const resp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: params,
    });

    const data = await resp.json();
    const accessToken = data.access_token;
    if (!accessToken) throw new Error("No se obtuvo access token");

    const githubUser = await getGitHubUser(accessToken);
    if (!githubUser) throw new Error("No se pudo obtener usuario GitHub");

 
    if (mode === "link" && token) {
      console.log("🔗 Modo vinculación detectado, validando token JWT...");

      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!);
        console.log("Token válido:", decoded);
      } catch (err: any) {
        throw new Error("Token inválido o expirado");
      }

      const mongoClient = await clientPromise;
      const db = mongoClient.db("ServineoBD");
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(decoded.id) });

      if (!user) throw new Error("Usuario no encontrado");
      const alreadyLinked = user.authProviders?.some(
        (p: any) => p.provider === "github"
      );
      if (alreadyLinked) throw new Error("Ya tiene GitHub vinculado");

      await db.collection("users").updateOne(
        { _id: new ObjectId(decoded.id) },
        {
          $push: {
            authProviders: {
              provider: "github",
              providerId: githubUser.email,
              linkedAt: new Date(),
            },
          },
        } as any
      );

      console.log("Cuenta GitHub vinculada correctamente");
      return res.send(`
        <script>
          window.opener.postMessage({
            type: 'GITHUB_LINK_SUCCESS',
            message: 'Cuenta GitHub vinculada correctamente'
          }, '${FRONTEND_URL}');
          window.close();
        </script>
      `);
    }

    if (mode === "login-only") {
      console.log("🔐 Modo LOGIN-ONLY detectado");

      const dbUser = await findUserByEmail(githubUser.email);

      if (!dbUser) {
        // Usuario NO existe → avisamos al frontend de login
        return res.send(`
          <script>
            window.opener.postMessage({
              type: 'GITHUB_AUTH_ERROR',
              message: 'Usuario no registrado. Por favor regístrate.'
            }, '${FRONTEND_URL}');
            window.close();
          </script>
        `);
      }

      const sessionToken = generarToken(
        dbUser._id.toHexString(),
        dbUser.name,
        dbUser.email
      );

      return res.send(`
        <script>
          window.opener.postMessage({
            type: 'GITHUB_AUTH_SUCCESS',
            token: '${sessionToken}',
            isFirstTime: false,
            user: ${JSON.stringify({
              id: dbUser._id.toHexString(),
              name: dbUser.name,
              email: dbUser.email,
              photo: dbUser.url_photo || null,
            })}
          }, '${FRONTEND_URL}');
          window.close();
        </script>
      `);
    }
    
    let dbUser = await findUserByEmail(githubUser.email);
    let isFirstTime = false;

    if (!dbUser) {
      dbUser = await createUser(githubUser);
      isFirstTime = true;
    }

    const sessionToken = generarToken(
      dbUser._id.toHexString(),
      dbUser.name,
      dbUser.email
    );

    return res.send(`
  <script>
      window.opener.postMessage({
        type: 'GITHUB_AUTH_SUCCESS',
        token: '${sessionToken}',
        isFirstTime: ${isFirstTime},
        user: ${JSON.stringify({
          id: dbUser._id.toHexString(),
          name: dbUser.name,
          email: dbUser.email,
          photo: dbUser.url_photo || null,
        })}
      }, '${FRONTEND_URL}');
      window.close();
    </script>
  `);
  } catch (err: any) {
    console.error("Error en GitHub OAuth:", err.message);
    res.send(`
      <script>
        window.opener.postMessage({
          type: '${String(state || "").includes("link") ? "GITHUB_LINK_ERROR" : "GITHUB_AUTH_ERROR"}',
          message: '${err.message || "Error al procesar"}'
        }, '${FRONTEND_URL}');
        window.close();
      </script>
    `);
  }
}
