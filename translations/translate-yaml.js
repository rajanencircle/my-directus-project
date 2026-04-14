const fs = require("fs-extra");
const yaml = require("js-yaml");
const axios = require("axios");
const path = require("path");

// ==============================
// CLI Arguments
// ==============================
// node translate-yaml.js en-US.yaml "English" en "German Swiss" de-CH

const [, , inputFile, sourceLang, sourceCode, targetLang, targetCode] =
  process.argv;

if (!inputFile || !sourceLang || !sourceCode || !targetLang || !targetCode) {
  console.log(
    "Usage:\nnode translate-yaml.js <file> <fromLang> <fromCode> <toLang> <toCode>",
  );
  process.exit(1);
}

// ==============================
// CONFIG
// ==============================
const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "translategemma:4b";

// ==============================
// Prompt builder (IMPORTANT: 2 blank lines)
// ==============================
function buildPrompt(text) {
  return `You are a professional ${sourceLang} (${sourceCode}) to ${targetLang} (${targetCode}) translator. Your goal is to accurately convey the meaning and nuances of the original ${sourceLang} text while adhering to ${targetLang} grammar, vocabulary, and cultural sensitivities.
Produce only the ${targetLang} translation, without any additional explanations or commentary. Please translate the following ${sourceLang} text into ${targetLang}:


${text}`;
}

// ==============================
// Translate using Ollama
// ==============================
async function translate(text) {
  try {
    const res = await axios.post(OLLAMA_URL, {
      model: MODEL,
      stream: false,
      prompt: buildPrompt(text),
    });

    if (res.status === 200 && res.data?.response) {
      return res.data.response.trim();
    }

    return null;
  } catch (err) {
    console.error("Translation error:", text);
    return null;
  }
}

// ==============================
// Recursively translate object
// ==============================
async function translateObject(obj, path = "") {
  const result = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === "string") {
      console.log("Translating:", currentPath);

      const translated = await translate(value);

      if (translated) {
        result[key] = translated;
      } else {
        console.log("Skipped:", currentPath);
        result[key] = value; // fallback to original
      }
    } else if (typeof value === "object" && value !== null) {
      result[key] = await translateObject(value, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ==============================
// Main
// ==============================
async function main() {
  try {
    const file = fs.readFileSync(inputFile, "utf8");

    const data = yaml.load(file);

    const translated = await translateObject(data);

    const outputFile = `${targetCode}.yaml`;

    const yamlStr = yaml.dump(translated, {
      lineWidth: -1,
      quotingType: '"',
    });

    fs.writeFileSync(outputFile, yamlStr, "utf8");

    console.log("\nDone!");
    console.log("Output:", outputFile);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
