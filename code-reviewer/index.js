import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({});

// =============================
// TOOL FUNCTIONS
// =============================

async function listFiles({ directory }) {
  const files = [];
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json"];

  function scan(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      if (
        fullPath.includes("node_modules") ||
        fullPath.includes("dist") ||
        fullPath.includes("build")
      )
        continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(directory);
  console.log(`Found ${files.length} files`);
  return { files };
}

async function readFile({ file_path }) {
  const content = fs.readFileSync(file_path, "utf-8");
  console.log(`Reading: ${file_path}`);
  return { content };
}

async function writeFile({ file_path, content }) {
  fs.writeFileSync(file_path, content, "utf-8");
  console.log(`Fixed: ${file_path}`);
  return { success: true };
}

// =============================
// TOOL REGISTERY
// =============================

const tools = {
  listFiles: listFiles,
  readFile: readFile,
  writeFile: writeFile,
};
// =============================
// TOOL DECLARATIONS
// =============================

const listFilesTool = {
  name: "listFiles",
  description: "Get all JavaScript files in a directory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: "Directory path to scan",
      },
    },
    required: ["directory"],
  },
};

const readFileTool = {
  name: "readFile",
  description: "Read a file's content",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "Path to the file",
      },
    },
    required: ["file_path"],
  },
};

const writeFileTool = {
  name: "writeFile",
  description: "Write fixed content back to the file",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "Path to the file to write",
      },
      content: {
        type: Type.STRING,
        description: "The fixed/corrected content",
      },
    },
    required: ["file_path", "content"],
  },
};

export async function runAgent(directoryPath) {
  console.log(`Reviewing: ${directoryPath}\n`);

  const History = [
    {
      role: "user",
      parts: [
        { text: `Review and fix all JavaScript code in: ${directoryPath}` },
      ],
    },
  ];

  while (true) {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `
                    You are an expert Senior Software Engineer and Code Reviewer.

                    Your task is to review an entire codebase and improve it while preserving the original functionality.

                    Guidelines:

                    1. Find and fix all bugs.
                    2. Fix syntax errors.
                    3. Fix logical errors.
                    4. Fix runtime errors.
                    5. Detect security vulnerabilities.
                    6. Detect hardcoded secrets such as:
                    - API Keys
                    - Passwords
                    - Tokens
                    - Private Keys
                    7. Replace hardcoded secrets with environment variables whenever possible.
                    8. Improve code readability.
                    9. Improve naming where appropriate.
                    10. Remove dead code.
                    11. Remove unused imports and variables.
                    12. Improve folder/file consistency.
                    13. Handle edge cases.
                    14. Add proper error handling using try/catch where necessary.
                    15. Avoid crashing the application.
                    16. Improve performance where possible.
                    17. Preserve the existing business logic.
                    18. Never remove functionality unless it is clearly broken.
                    19. Keep formatting clean and consistent.
                    20. If a file needs modification, use the writeFile tool to overwrite the file with the improved version.
                    21. Always read the file before modifying it.
                    22. Never assume file contents.
                    23. Review every JavaScript, TypeScript, JSX, TSX, JSON, HTML and CSS file provided by the listFiles tool.
                    24. Continue reviewing files until no files remain.
                    25. When all reviews are complete, provide a summary including:
                    - Files reviewed
                    - Bugs fixed
                    - Security issues fixed
                    - Performance improvements
                    - Code quality improvements
                    - Any remaining issues requiring manual attention.

                    Think carefully before making changes.
                    Always produce production-quality code.
                    `,
        tools: [
          {
            functionDeclarations: [listFilesTool, readFileTool, writeFileTool],
          },
        ],
      },
    });

    if (result.functionCalls?.length > 0) {
      for (const functionCall of result.functionCalls) {
        const { name, args } = functionCall;

        console.log(`${name}`);
        const toolResponse = await tools[name](args);

        History.push({
          role: "model",
          parts: [{ functionCall }],
        });

        History.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name,
                response: { result: toolResponse },
              },
            },
          ],
        });
      }
    } else {
      console.log("\n" + result.text);
      break;
    }
  }
}

const directory = process.argv[2] || ".";

await runAgent(directory);
