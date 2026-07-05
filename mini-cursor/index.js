
import { GoogleGenAI, Type } from "@google/genai";
import { exec } from "child_process";
import util from "util";
import readlinesync from "readline-sync";
import "dotenv/config";
import os, { type } from "os";
import fs from "fs/promises";


const platform = os.platform();
const execute = util.promisify(exec);
const ai = new GoogleGenAI({});

// Execute Command Tool
async function executeCommand({ command }) {
  try {
    const { stdout, stderr } = await execute(command);

    if (stderr) {
      return `Error: ${stderr}`;
    }
    return `Success: ${stdout}`;
  } catch (err) {
    return `Error: ${err}`;
  }
}

// WriteFile Tool
async function writeFile({ filePath, content }) {
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return `Success: File written at ${filePath}`;
  } catch (err) {
    return `Error: ${err}`;
  }
}

// Tool Declarations(Function schema)
const commandExecuter = {
  name: "executeCommand",
  description:
    "It takes any shell/terminal command and executes it. Use ONLY for creating/deleting folder and files (mkdir, touch/type nul). Do NOT use this to write code content into files",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: "The terminal/shell command. Ex: mkdir calculator",
      },
    },
    required: ["command"],
  },
};

const writeFileTool = {
  name: "writeFile",
  description:
    "Writes given text content directly into a file. ALWAYS use this to write HTML, CSS, or JS code content",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Path of file, e.g. calculator/index.html",
      },
      content: {
        type: Type.STRING,
        description: "Full text content to write into the file",
      },
    },
    required: ["filePath", "content"],
  },
};

const tools = [
  {
    functionDeclarations: [commandExecuter, writeFileTool],
  },
];

const toolFunctions = {
  executeCommand: executeCommand,
  writeFile: writeFile,
};

const History = [];

async function generateWithRetry(params) {
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      if (err.status === 429) {
        console.log("Rate limit hit, waiting 30 seconds...");
        await new Promise((res) => setTimeout(res, 30000));
      } else {
        throw err;
      }
    }
  }
}

async function buildWebsite() {
  while (true) {
    const result = await generateWithRetry({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `you are a website builder, which will create the frontend part of the website. 
        
        Give commands according to the Operating system we are using. My Current Operating system is ${platform}.

        Step By Step Guide
        1: First create the folder for the website using executeCommand, ex: mkdir calculator
        2: Use executeCommand to create empty html, css, and js files
        3: Use writeFile tool to write the HTML code content into the html file
        4: Use writeFile tool to write the CSS code content into the css file
        5: Use writeFile tool to write the JS code content into the js file
        6: Fix errors if present by using writeFile again to update content

        IMPORTANT: Use executeCommand ONLY for creating/deleting folders and files. Use writeFile tool for writing any actual code content. Never use echo or shell redirection to write code.
        `,
        tools: tools,
      },
    });

    if(result.functionCalls && result.functionCalls.length> 0){
        const functionCall = result.functionCalls[0]
        const {name, args} = functionCall

        const toolResponse = await toolFunctions[name](args)

        const functionResponsePart = {
            name: functionCall.name,
            response: {
                result: toolResponse,
            }
        }

        History.push({
            role: "model",
            parts: [{functionCall: functionCall}]
        })

        History.push({
            role: "user",
            parts: [{functionResponse: functionResponsePart}]
        })
    } else{
        console.log(result.text);
        History.push({
            role: "model",
            parts: [{text: result.text}]
        })
        break;
    }
  }
}

while (true) {
  const question = readlinesync.question("Ask me anything ---> ");

  if (question == "exit") {
    break;
  }

  History.push({
    role: "user",
    parts: [{ text: question }],
  });

  await buildWebsite();
}
