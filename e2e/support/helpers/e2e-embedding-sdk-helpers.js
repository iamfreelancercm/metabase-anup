import * as jose from "jose";

import { USERS } from "e2e/support/cypress_data";

export const EMBEDDING_SDK_STORY_HOST = "http://localhost:6006/iframe.html";

export const METABASE_INSTANCE_URL = "http://localhost:3000";

export const JWT_PROVIDER_URL = "http://jtw-provider/sso";

export const JWT_SHARED_SECRET =
  "0000000000000000000000000000000000000000000000000000000000000000";

export const mockJwtProvider = (user = USERS.admin) => {
  cy.intercept("GET", JWT_PROVIDER_URL, async req => {
    try {
      const secret = new TextEncoder().encode(JWT_SHARED_SECRET);
      const token = await new jose.SignJWT({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        groups: [user.group],
        exp: Math.round(Date.now() / 1000) + 60 * 10, // 10 minutes expiration
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      const ssoUrl = `${METABASE_INSTANCE_URL}/auth/sso?token=true&jwt=${token}`;

      const response = await fetch(ssoUrl, { method: "GET" });
      const session = await response.text();

      req.reply({
        statusCode: 200,
        body: session,
      });
    } catch (error) {
      console.log("error", error);
      req.reply({
        statusCode: 500,
        body: error.message,
      });
    }
  }).as("jwtProvider");
};
