#!/usr/bin/env node
/**
 * Authentication and Message Testing Tool
 * Tests login flow and message sending functionality
 */

const apiUrl = "http://localhost:5049";

console.log("🧪 Authentication & Message Sending Test\n");
console.log("=".repeat(70));

async function testAuthAndMessages() {
  try {
    // Step 1: Test login endpoint
    console.log("\n[STEP 1] Testing login endpoint...");
    console.log("📝 Note: Enter valid credentials to test");
    console.log("");
    console.log("💡 Default test credentials (if seeded):");
    console.log("   Email: test@example.com");
    console.log("   Password: test123");
    console.log("");

    // For now, we'll just check if the endpoint exists
    const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "contato.cainandesign@gmail.com",
        password: "test123", // Change this to your actual password
      }),
    });

    console.log(`📡 Login endpoint response status: ${loginRes.status}`);

    if (loginRes.status === 200 || loginRes.status === 201) {
      const loginData = await loginRes.json();
      console.log("✅ Login successful!");
      console.log(`   Token received: ${loginData.token?.substring(0, 50)}...`);

      const token = loginData.token;

      // Step 2: Get conversations with the new token
      console.log("\n[STEP 2] Fetching conversations with new token...");
      const conversationsRes = await fetch(`${apiUrl}/api/conversations`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (conversationsRes.ok) {
        const conversations = await conversationsRes.json();
        console.log(`✅ Conversations fetched successfully!`);
        console.log(`   Total conversations: ${conversations.length}`);

        if (conversations.length > 0) {
          const testConv = conversations[0];
          console.log(`   Using conversation: ${testConv.leadName} (ID: ${testConv.id})`);

          // Step 3: Send a test message
          console.log("\n[STEP 3] Sending test message...");
          const messageRes = await fetch(`${apiUrl}/api/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              conversationId: testConv.id,
              sender: "operator",
              content: `✅ Test message - ${new Date().toLocaleString('pt-BR')}`,
            }),
          });

          if (messageRes.ok) {
            const message = await messageRes.json();
            console.log("✅ Message sent successfully!");
            console.log(`   Message ID: ${message.id}`);
            console.log(`   Content: ${message.content}`);
            console.log(`   Status: ${message.status}`);

            // Step 4: Verify message was saved
            console.log("\n[STEP 4] Verifying message in database...");
            const messagesRes = await fetch(
              `${apiUrl}/api/messages/conversation/${testConv.id}`,
              {
                headers: {
                  "Authorization": `Bearer ${token}`,
                },
              }
            );

            if (messagesRes.ok) {
              const messages = await messagesRes.json();
              const found = messages.some(m => m.id === message.id);
              if (found) {
                console.log("✅ Message verified in database!");
              } else {
                console.log("⚠️  Message not found in database (may be a timing issue)");
              }
            }
          } else {
            const errText = await messageRes.text();
            console.log(`❌ Failed to send message: ${messageRes.status}`);
            console.log(`   Response: ${errText.substring(0, 200)}`);
          }
        } else {
          console.log("⚠️  No conversations found, skipping message sending test");
        }
      } else {
        const errText = await conversationsRes.text();
        console.log(`❌ Failed to fetch conversations: ${conversationsRes.status}`);
        console.log(`   Response: ${errText.substring(0, 200)}`);
      }
    } else if (loginRes.status === 401 || loginRes.status === 400) {
      const errData = await loginRes.json();
      console.log(`❌ Login failed: ${loginRes.status}`);
      console.log(`   Error: ${errData.error || "Invalid credentials"}`);
      console.log("\n💡 Common solutions:");
      console.log("   1. Check if you're using the correct email/password");
      console.log("   2. Make sure the backend server is running on port 5049");
      console.log("   3. Check if the database is accessible");
    } else {
      console.log(`❌ Unexpected response status: ${loginRes.status}`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Test completed!");
    console.log("=".repeat(70));
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    if (error.message.includes("ECONNREFUSED")) {
      console.error("\n💡 Connection refused!");
      console.error("   Make sure the backend server is running:");
      console.error("   npm run dev:server");
    }
    console.error(error.stack);
  }
}

testAuthAndMessages();
