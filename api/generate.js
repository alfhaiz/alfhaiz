import {
    GoogleGenerativeAI
}
from"@google/generative-ai";
const genAI=new GoogleGenerativeAI(process.env.GEMINI_API_KEY),safetySettings=[ {
    category:"HARM_CATEGORY_HARASSMENT",threshold:"BLOCK_MEDIUM_AND_ABOVE"
},
{
    category:"HARM_CATEGORY_HATE_SPEECH",threshold:"BLOCK_MEDIUM_AND_ABOVE"
},
{
    category:"HARM_CATEGORY_SEXUALLY_EXPLICIT",threshold:"BLOCK_MEDIUM_AND_ABOVE"
},
{
    category:"HARM_CATEGORY_DANGEROUS_CONTENT",threshold:"BLOCK_MEDIUM_AND_ABOVE"
}
],SYSTEM_INSTRUCTIONS= {
    chat:"Anda adalah Alfhaiz, asisten AI yang ramah dan membantu. Selalu gunakan Markdown dan emoji.",agent_planner:'Anda adalah AI perencana proyek web. Berdasarkan permintaan pengguna, buat daftar file yang dibutuhkan.\n    PERINTAH: Respons HANYA dengan objek JSON.\n    STRUKTUR JSON:  {
        "files": ["index.html", "style.css", "script.js", ...]
    }
    \n    CONTOH: Jika user meminta "halaman login", output Anda harus:  {
        "files": ["index.html", "style.css"]
    }
    ',agent_executor:"Anda adalah AI pembuat kode. Berdasarkan tujuan pengguna dan kode yang sudah ada, buat kode HANYA untuk file yang diminta.\n    PERINTAH: Respons HANYA dengan kode mentah (raw code). TANPA penjelasan, TANPA markdown, TANPA sapaan."
};
export default async function handler(e,s) {
    if("POST"!==e.method)return s.status(405).end();
    try {
        const {
            history:t,model:o,mode:a,context:r
        }
        =e.body,n=a.startsWith("agent_"),i=SYSTEM_INSTRUCTIONS[a]||SYSTEM_INSTRUCTIONS.chat,c= {
            temperature:n?.3:.7,topP:1,topK:1,maxOutputTokens:8192,response_mime_type:"agent_planner"===a?"application/json":"text/plain"
        },
        d=genAI.getGenerativeModel( {
            model:o||"gemini-2.5-flash",systemInstruction: {
                role:"model",parts:[ {
                    text:i
                }
                ]
            }
        }),
        u="agent_executor"===a?r:t[t.length-1].parts,l=await d.generateContent(u),m=l.response,p=m.text();
        return s.status(200).json( {
            data:p
        })
    }
    catch(e) {
        return console.error("Error calling Gemini API:",e),s.status(500).json( {
            error:"Failed to get response from AI."
        })
    }
}