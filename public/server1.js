const express = require("express");
const ldap = require("ldapjs");

const app = express();
const PORT = 3000;

// LDAP Configuration
const ldapOptions = {
  url: "ldap://10.0.1.100:389", // use ldaps:// for secure connection
};

const bindDN = "ldap_reader@corp.example.local";
const bindCredentials = "YourSecurePassword";
const baseDN = "dc=corp,dc=example,dc=local";

// Endpoint: /user?username=john.doe
app.get("/user", async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: "Missing username" });

  const client = ldap.createClient(ldapOptions);

  client.bind(bindDN, bindCredentials, (err) => {
    if (err) {
      console.error("LDAP bind failed:", err);
      return res.status(500).json({ error: "LDAP bind failed" });
    }

    const searchOptions = {
      filter: `(sAMAccountName=${username})`,
      scope: "sub",
      attributes: ["cn", "mail", "memberOf", "title", "department"],
    };

    client.search(baseDN, searchOptions, (err, result) => {
      if (err) {
        console.error("LDAP search error:", err);
        client.unbind();
        return res.status(500).json({ error: "LDAP search error" });
      }

      let userEntry = null;

      result.on("searchEntry", (entry) => {
        userEntry = entry.object;
      });

      result.on("end", () => {
        client.unbind();
        if (!userEntry) {
          return res.status(404).json({ error: "User not found" });
        }
        return res.json(userEntry);
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`LDAP PIP API running on http://localhost:${PORT}`);
});
