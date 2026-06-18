`js
// functions/hermes.js
import { Hermes } from "@hermes/core"
import config from "../hermes.config.js"

export default async (req, context) => {
  const agent = new Hermes(config)

  const body = await req.json()
  const { agentName, message } = body

  const reply = await agent.run(agentName, message)

  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" }
  })
}
`
