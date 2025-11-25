#!/usr/bin/env node
/**
 * Test Message Sending Functionality
 * Tests the complete message flow through the API
 */

const apiUrl = "http://localhost:5049";

// Use a valid token from your environment
const authToken = process.env.TEST_AUTH_TOKEN || "eyJhbGciOiJIUzI1NiIsImtpZCI6ImlrcFZ1bU1sdUdENitDUksiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3N2ZnVjdXN1aG53bXd5b2pteGdyLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJmMmJkZjU5NC1hN2VmLTRjNzktODViOS1jZmM0MDgwN2FhZDIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNjgxNjUwLCJpYXQiOjE3NjE2NzgwNTAsImVtYWlsIjoiY29udGF0by5jYWluYW5kZXNpZ25AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImNvbnRhdG8uY2FpbmFuZGVzaWduQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiY2FpbmFuIG1haWEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImYyYmRmNTk0LWE3ZWYtNGM3OS04NWI5LWNmYzQwODA3YWFkMiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzYxNjc4MDUwfV0sInNlc3Npb25faWQiOiIxYTU5MWY5ZC01NjUzLTQ3ZDctOTljMi1hYjE3N2UxNTViOTkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.N7CVTQm9YbygAk7qVJ42NEQ84nkov8nTyJ4U_6rlQVE";

console.log("🧪 Testing Message Sending Functionality\n");
console.log("=" .repeat(70));

async function testMessageSending() {
  try {
    // Step 1: Get all conversations
    console.log("\n[STEP 1] Fetching conversations...");
    const conversationsRes = await fetch(`${apiUrl}/api/conversations`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!conversationsRes.ok) {
      console.error(`❌ Failed to fetch conversations: ${conversationsRes.status}`);
      const errText = await conversationsRes.text();
      console.error(`   Response: ${errText.substring(0, 200)}`);
      return;
    }

    const conversations = await conversationsRes.json();
    console.log(`✅ Found ${conversations.length} conversations`);

    if (conversations.length === 0) {
      console.log("⚠️  No conversations found. Creating test conversation...");

      // Create a test conversation
      const createConvRes = await fetch(`${apiUrl}/api/conversations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          iaId: "1", // Adjust based on your IA ID
          leadName: "Test Contact",
          channel: "whatsapp",
          attendanceId: `TEST-${Date.now()}`,
          iaEnabled: 1,
        }),
      });

      if (!createConvRes.ok) {
        console.error(`❌ Failed to create conversation: ${createConvRes.status}`);
        return;
      }

      const newConv = await createConvRes.json();
      console.log(`✅ Created conversation:`, newConv);
      conversations.push(newConv);
    }

    const testConversation = conversations[0];
    console.log(`\n   Using conversation: ${testConversation.leadName} (ID: ${testConversation.id})`);

    // Step 2: Send a test message
    console.log("\n[STEP 2] Sending test message...");
    const messageRes = await fetch(`${apiUrl}/api/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: testConversation.id,
        sender: "operator",
        content: `🧪 Test message sent at ${new Date().toLocaleString('pt-BR')}`,
      }),
    });

    if (!messageRes.ok) {
      console.error(`❌ Failed to send message: ${messageRes.status}`);
      const errText = await messageRes.text();
      console.error(`   Response: ${errText.substring(0, 200)}`);
      return;
    }

    const sentMessage = await messageRes.json();
    console.log(`✅ Message sent successfully!`);
    console.log(`   ID: ${sentMessage.id}`);
    console.log(`   Content: ${sentMessage.content}`);
    console.log(`   Sender: ${sentMessage.sender}`);
    console.log(`   Timestamp: ${sentMessage.timestamp || sentMessage.createdAt}`);

    // Step 3: Fetch messages to verify
    console.log("\n[STEP 3] Fetching messages from conversation...");
    const messagesRes = await fetch(`${apiUrl}/api/messages/conversation/${testConversation.id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!messagesRes.ok) {
      console.error(`❌ Failed to fetch messages: ${messagesRes.status}`);
      return;
    }

    const messages = await messagesRes.json();
    console.log(`✅ Found ${messages.length} messages in conversation`);

    // Find our test message
    const ourMessage = messages.find(m => m.id === sentMessage.id);
    if (ourMessage) {
      console.log(`✅ Our test message was found in the conversation!`);
      console.log(`   Message confirmed: "${ourMessage.content}"`);
    } else {
      console.warn(`⚠️  Our message ID (${sentMessage.id}) not found in conversation messages`);
      console.log("   Last 3 messages:");
      messages.slice(-3).forEach((msg, idx) => {
        console.log(`   ${idx + 1}. [${msg.sender}] ${msg.content.substring(0, 50)}`);
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ MESSAGE SENDING TEST COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error.stack);
  }
}

testMessageSending();
