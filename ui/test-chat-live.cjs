const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Testing chat tools on live deployment...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--ignore-certificate-errors']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  try {
    // Go to chat page
    console.log('📍 Navigating to chat page...');
    await page.goto('https://emergency-investor-demo.translation-helps-mcp.pages.dev/chat');
    
    // Wait for chat to load
    console.log('⏳ Waiting for chat interface...');
    await page.waitForTimeout(3000); // Give page time to load
    
    // Debug: print page content
    const content = await page.textContent('body');
    console.log('Page content preview:', content.substring(0, 500));
    
    // Try different selectors
    const textarea = await page.$('textarea');
    const input = await page.$('input[type="text"]');
    
    if (!textarea && !input) {
      console.log('❌ No input field found!');
      await page.screenshot({ path: 'chat-debug.png' });
      throw new Error('Input field not found');
    }
    
    // Type scripture request
    console.log('✍️ Typing scripture request...');
    await page.fill('textarea[placeholder*="Type your message"]', 'Show me Titus 1:1');
    
    // Press Enter
    await page.keyboard.press('Enter');
    
    // Wait for response
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(5000);
    
    // Get response text
    const messages = await page.$$('.flex.flex-col.gap-4 > div');
    const lastMessage = messages[messages.length - 1];
    const responseText = await lastMessage.textContent();
    
    console.log('\n📖 Response received:');
    console.log(responseText);
    
    // Check if it contains scripture
    if (responseText.includes('Titus 1:1') && responseText.includes('ULT')) {
      console.log('\n✅ SUCCESS: Chat returned real scripture!');
    } else {
      console.log('\n❌ FAIL: Response does not contain expected scripture');
    }
    
    // Click X-Ray button
    console.log('\n🔍 Checking X-Ray data...');
    const xrayButtons = await page.$$('button:has-text("View X-Ray")');
    if (xrayButtons.length > 0) {
      await xrayButtons[xrayButtons.length - 1].click();
      await page.waitForTimeout(1000);
      
      // Check for tool usage
      const xrayText = await page.textContent('body');
      if (xrayText.includes('fetch_scripture')) {
        console.log('✅ X-Ray shows fetch_scripture tool was used!');
      } else {
        console.log('❌ X-Ray does not show tool usage');
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'chat-live-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as chat-live-test.png');
    
    // Test translation notes
    console.log('\n\n🔄 Testing translation notes...');
    await page.fill('textarea[placeholder*="Type your message"]', 'What notes are in Titus 1:1?');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(5000);
    
    const messages2 = await page.$$('.flex.flex-col.gap-4 > div');
    const lastMessage2 = messages2[messages2.length - 1];
    const notesResponse = await lastMessage2.textContent();
    
    console.log('\n📝 Notes response:');
    console.log(notesResponse);
    
    if (notesResponse.includes('Translation Notes')) {
      console.log('\n✅ SUCCESS: Translation notes working!');
    } else {
      console.log('\n❌ FAIL: No translation notes found');
    }
    
    await page.screenshot({ path: 'chat-notes-test.png', fullPage: true });
    
    console.log('\n✨ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();