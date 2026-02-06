import { NextRequest, NextResponse } from 'next/server'

const MANAGER_AGENT_ID = '6985ee82dea12af725a8940a'

export async function POST(req: NextRequest) {
  try {
    const { message, user_id, session_id } = await req.json()

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Call the Manager Agent (Task Delegation Coordinator)
    const agentResponse = await fetch('https://api.agentprod.com/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.AGENTPROD_API_KEY || '',
      },
      body: JSON.stringify({
        message,
        agent_id: MANAGER_AGENT_ID,
        user_id: user_id || 'default_user',
        session_id: session_id || `session_${Date.now()}`,
      }),
    })

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: `Agent API error: ${agentResponse.statusText}`,
          details: errorData,
        },
        { status: agentResponse.status }
      )
    }

    const data = await agentResponse.json()

    // Parse the response - the Manager Agent may return plain text or JSON
    let parsedResponse
    try {
      if (data.response && typeof data.response === 'string') {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = data.response.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1])
        } else {
          // Try to parse directly
          parsedResponse = JSON.parse(data.response)
        }
      } else {
        parsedResponse = data.response || data
      }
    } catch (e) {
      // If parsing fails, return the raw text response
      parsedResponse = {
        status: 'success',
        result: {
          message: data.response || data.raw_response || 'No response received',
        },
        metadata: {
          agent_name: 'Task Delegation Coordinator',
          timestamp: new Date().toISOString(),
        },
      }
    }

    return NextResponse.json({
      success: true,
      response: parsedResponse,
      agent_id: MANAGER_AGENT_ID,
      user_id: data.user_id,
      session_id: data.session_id,
      timestamp: new Date().toISOString(),
      raw_response: data.response,
    })
  } catch (error) {
    console.error('Error processing delegations:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: String(error),
      },
      { status: 500 }
    )
  }
}
