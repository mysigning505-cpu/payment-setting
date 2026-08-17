const Busboy = require("busboy");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return {statusCode:204, headers, body:""};
  if (event.httpMethod !== "POST")
    return {statusCode:405, headers, body:JSON.stringify({error:"Method not allowed"})};

  const webhook = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1538874406678302771/bB2fE4Yz9eux6vn4wNKjH6m9N8e40cCCtyDWGZ6ISNnH0ah1vyiwjJUPxpXVFvNfvbMM";
  if (!webhook)
    return {statusCode:500, headers, body:JSON.stringify({error:"DISCORD_WEBHOOK_URL is not configured"})};

  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data"))
    return {statusCode:400, headers, body:JSON.stringify({error:"Expected multipart form data"})};

  const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");

  return new Promise((resolve) => {
    const bb = Busboy({
      headers: {"content-type": contentType},
      limits: {files:1, fileSize:8*1024*1024, fields:10}
    });

    let chunks = [];
    let fileName = "payment-screenshot";
    let mimeType = "";
    let tooLarge = false;
    let utr = "", amount = "", upi = "";

    bb.on("field", (name, value) => {
      if(name === "utr") utr = value.slice(0,100);
      if(name === "amount") amount = value.slice(0,50);
      if(name === "upi") upi = value.slice(0,150);
    });

    bb.on("file", (name, file, info) => {
      fileName = info.filename || fileName;
      mimeType = info.mimeType || "";
      if(!mimeType.startsWith("image/")){
        file.resume();
        return;
      }
      file.on("data", c => chunks.push(c));
      file.on("limit", () => tooLarge = true);
    });

    bb.on("error", () =>
      resolve({statusCode:400, headers, body:JSON.stringify({error:"Invalid upload"})})
    );

    bb.on("finish", async () => {
      try{
        if(tooLarge) return resolve({statusCode:413, headers, body:JSON.stringify({error:"Image is larger than 8 MB"})});
        if(!chunks.length) return resolve({statusCode:400, headers, body:JSON.stringify({error:"No image uploaded"})});
        if(!mimeType.startsWith("image/")) return resolve({statusCode:400, headers, body:JSON.stringify({error:"Only image files are accepted"})});

        const form = new FormData();
        form.append("payload_json", JSON.stringify({
          content:
            "Payment proof received\n" +
            "Amount: ₹" + (amount || "N/A") + "\n" +
            "UTR: " + (utr || "Not provided") + "\n" +
            "UPI: " + (upi || "N/A")
        }));
        form.append("files[0]", new Blob([Buffer.concat(chunks)], {type:mimeType}), fileName);

        const r = await fetch(webhook, {method:"POST", body:form});
        if(!r.ok){
          console.error("Discord:", r.status, await r.text());
          return resolve({statusCode:502, headers, body:JSON.stringify({error:"Discord upload failed"})});
        }

        resolve({statusCode:200, headers, body:JSON.stringify({ok:true})});
      }catch(e){
        console.error(e);
        resolve({statusCode:500, headers, body:JSON.stringify({error:"Server error"})});
      }
    });

    bb.end(raw);
  });
};
