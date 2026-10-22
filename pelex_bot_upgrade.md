# Make Pelex read websites, build pages and write documents

## Why it said "I couldn't locate the page"
The agent has **no tool to open a link**. Search finds results; reading a specific page needs its own tool.

## 1. Add a "Read website" tool in n8n
On the AI Agent node: Tools > **+** > **HTTP Request Tool**
- Name: `read_website`
- Description: `Opens a web page and returns its readable text. Use it whenever the person gives a link or asks about a specific website. Input is the full address starting with https://`
- Method: GET
- URL: `https://r.jina.ai/{url}`
- Placeholder definitions > Add: name `url`, type String, description `The full web address to open, starting with https://`
- Options > Response > Optimize Response: **Text**, truncate to about **8000** characters
(Jina Reader is free but rate limited. If you hit limits, make a free key and add it as an `Authorization: Bearer ...` header.)

## 2. Use a model that supports tools
Tools only work with models that support "tool calling". On OpenRouter, open the model page and check that **tools** is in its supported parameters. Free models vary a lot here. Keep Groq as the fallback.

## 3. Paste the updated system message
`pelex_system_message.txt` now has rules 9 to 12 (links, websites, documents). Paste the whole file again into the AI Agent System Message (Expression mode).

## 4. What the site already does
- Code replies show **Copy** and **Download**. Web pages also get **Preview**, which runs the page safely in a sandbox.
- Long replies get **PDF** and **Word** buttons.

## About your test link
https://unclepelexprofile.netlify.app/ is a plain template page ("Your Name", a blue header, About, Services, Contact). Once the tool is added, Pelex will read exactly that. If you want a richer page recreated, point it at a site with a real design.
