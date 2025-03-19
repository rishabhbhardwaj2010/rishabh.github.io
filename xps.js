require("dotenv").config();
const express = require("express");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");
const EmailBuilder = require("../lib/EmailBuilder");
const {
  getGlobalContentWithMarkdown,
  getAssetById,
  getCongressById,
} = require("./dataRetrieval");

const app = express();

// MSAL Configuration for Authentication
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

// Function to Get Access Token
async function getAccessToken() {
  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"],
  };

  try {
    const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
  } catch (err) {
    console.error("Error acquiring token:", err);
    throw err;
  }
}

// Function to Send Email Using Microsoft Graph API
async function sendEmailToAddress(message, to) {
  try {
    const accessToken = await getAccessToken();
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const emailMessage = {
      message: {
        subject: "Your QR code request: Download a file from Eli Lilly",
        body: {
          contentType: "HTML",
          content: message,
        },
        toRecipients: [{ emailAddress: { address: to } }],
        from: { emailAddress: { address: process.env.FROM_EMAIL } },
      },
    };

    await client.api("/me/sendMail").post(emailMessage);
    console.log("Email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// API Route to Send Email
const sendemail = (app) =>
  app.get("/sendemail/:assetId", async (req, res) => {
    try {
      const { assetId } = req.params;
      const { to, includelinks } = req.query;

      console.log(`Sending email to: ${to} for asset: ${assetId}`);

      const globalContent = await getGlobalContentWithMarkdown();
      const asset = await getAssetById(assetId);

      const allPosters = includelinks
        ? (await getCongressById(includelinks)).posters
        : [];

      const otherLinks = allPosters
        .filter((poster) => poster.id !== asset.id)
        .filter(isEffective)
        .map((poster) => ({
          title: poster.documentDescription,
          id: poster.id,
          posterNumberalphanumeric: poster.posterNumberalphanumeric,
          assetType: poster.assetType,
        }));

      const message = buildEmailBody(
        asset,
        globalContent,
        `${req.protocol}://${req.headers.host}`,
        otherLinks
      );

      await sendEmailToAddress(message, to);
      res.sendStatus(200);
    } catch (err) {
      console.error("Error processing email request:", err);
      res.sendStatus(500);
    }
  });

// Build Email Body Function
const buildEmailBody = (asset, globalContent, urlBase, otherLinks) => {
  const privacyStatement = globalContent.privacyStatement;
  const footerUrl = buildEmailFooter(globalContent);

  let builder = new EmailBuilder()
    .line(
      "Thank you for your request to download the following file from Eli Lilly and Company."
    )
    .bold("Conference Name:")
    .text(asset.conferenceName)
    .line()
    .line()
    .text("Selected Download: ")
    .link(
      `${
        asset.assetType && asset.posterNumberalphanumeric
          ? `${asset.assetType} # ${asset.posterNumberalphanumeric} - `
          : asset.assetType
          ? `${asset.assetType} - `
          : asset.posterNumberalphanumeric
          ? `${asset.posterNumberalphanumeric} - `
          : ""
      }${asset.documentDescription}`,
      `${urlBase}/download/${asset.id}?utm_source=email&scannedLink=true`
    )
    .line()
    .line();

  if (otherLinks.length) {
    builder = addOtherLinks(builder, otherLinks, urlBase);
  }

  builder = builder
    .line()
    .line(`<table border="1"><tr><td>${privacyStatement}</td></tr></table>`)
    .text(footerUrl);

  return builder.build();
};

// Function to Add Additional Links
const addOtherLinks = (builder, otherLinks, urlBase) => {
  return (
    otherLinks
      .reduce(
        (builder, { title, id, assetType, posterNumberalphanumeric }) =>
          builder
            .link(
              `${
                assetType && posterNumberalphanumeric
                  ? `${assetType} # ${posterNumberalphanumeric} - `
                  : assetType
                  ? `${assetType} - `
                  : posterNumberalphanumeric
                  ? `${posterNumberalphanumeric} - `
                  : ""
              }${title}`,
              `${urlBase}/download/${id}?utm_source=email&scannedLink=false`
            )
            .line(),
        builder.line("Additional Materials:")
      )
  );
};

// Build Email Footer
const buildEmailFooter = (globalContent) => {
  const imageDirectURL = globalContent.emailFooterLogo;
  const indexid = imageDirectURL.indexOf("//");
  const prefix = imageDirectURL.slice(0, indexid);
  const suffix = imageDirectURL.slice(indexid, imageDirectURL.length);
  return `${prefix}https:${suffix}`;
};

// Check if Asset is Valid Based on Date
function isEffective({ effectiveDate, expirationDate }) {
  const now = new Date().getTime();
  return now >= Date.parse(effectiveDate) && now <= Date.parse(expirationDate);
}

module.exports = sendemail;

// Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

