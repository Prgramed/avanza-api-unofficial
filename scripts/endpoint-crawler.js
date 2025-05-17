#!/usr/bin/env node

/**
 * Avanza API Endpoint Crawler
 * 
 * This script logs into Avanza's web interface using Puppeteer and monitors
 * all network requests to capture API endpoints that are being used.
 * It helps detect changes to API endpoints by comparing them with the 
 * constants.js file in the library.
 *
 * Usage:
 * 1. npm install puppeteer commander dotenv
 * 2. Create a .env file with AVANZA_USERNAME, AVANZA_PASSWORD, and AVANZA_TOTP_SECRET
 * 3. Run: node scripts/endpoint-crawler.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const commander = require('commander');
const totp = require('../lib/totp');
const constants = require('../lib/constants');
require('dotenv').config();

// Setup directory for saving crawler files
const CRAWLER_FILES_DIR = path.join(__dirname, 'crawler-files');
if (!fs.existsSync(CRAWLER_FILES_DIR)) {
  fs.mkdirSync(CRAWLER_FILES_DIR, { recursive: true });
}

// Helper function to generate file paths in the crawler files directory
function getCrawlerFilePath(filename) {
  return path.join(CRAWLER_FILES_DIR, filename);
}

const program = new commander.Command();

program
  .name('endpoint-crawler')
  .description('Crawl the Avanza website to detect API endpoint changes')
  .version('1.0.0')
  .option('-o, --output <path>', 'Output file for detected endpoints', getCrawlerFilePath('endpoints.json'))
  .option('-u, --username <username>', 'Avanza username', process.env.AVANZA_USERNAME)
  .option('-p, --password <password>', 'Avanza password', process.env.AVANZA_PASSWORD)
  .option('-t, --totp-secret <secret>', 'TOTP secret for 2FA', process.env.AVANZA_TOTP_SECRET)
  .option('-d, --debug', 'Run browser in non-headless mode for debugging', false)
  .option('-r, --record <path>', 'Record HAR file of network traffic', getCrawlerFilePath('avanza-traffic.har'))
  .option('-c, --compare', 'Compare detected endpoints with constants.js', false)
  .option('-s, --skip-login', 'Skip login and just check if crawler can detect API endpoints', false)
  .option('-w, --wait <milliseconds>', 'Wait time in ms between page navigations to ensure all requests are captured', 3000);

program.parse();

const options = program.opts();

// Check if required options are provided when not in skip-login mode
if (!options.skipLogin && (!options.username || !options.password || !options.totpSecret)) {
  console.error(
    'Error: Username, password, and TOTP secret are required for login.\n' +
    'Provide them via command line arguments or in a .env file.\n' +
    'Or use --skip-login to only test network request detection.'
  );
  process.exit(1);
}

// Endpoint data storage
const endpoints = {
  mobile: [],
  api: [],
  other: [],
  timestamp: new Date().toISOString()
};

// Keep track of endpoints defined in constants.js 
const libraryEndpoints = {};
Object.keys(constants.paths).forEach(key => {
  const path = constants.paths[key];
  const baseEndpoint = path.split('?')[0];
  libraryEndpoints[baseEndpoint] = key;
});

/**
 * Main function to crawl Avanza website
 */
async function crawlAvanza() {
  console.log('Starting Avanza API endpoint crawler...');
  
  // Add sanity checks to ensure the crawler can identify endpoints
  // 1. Check existing endpoints in constants.js
  const testEndpoint = constants.paths.OVERVIEW_PATH;
  console.log(`Checking existing endpoint in constants.js: ${testEndpoint}`);
  if (testEndpoint && testEndpoint.startsWith('/_api/')) {
    console.log('✓ Existing API endpoint found in constants.js');
  } else if (testEndpoint) {
    console.log('! Existing endpoint is not using /_api/ format:', testEndpoint);
  } else {
    console.log('✗ Could not find endpoint to check');
  }
  
  // 2. Test the crawler's ability to detect network requests on the public site
  console.log('\nTesting network request detection on public Avanza site...');
  try {
    // Launch a test browser just for this check
    const testBrowser = await puppeteer.launch({ 
      headless: true, // Always use headless for this test
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const testPage = await testBrowser.newPage();
    
    // Setup request monitoring
    const testRequests = [];
    testPage.on('request', request => {
      const url = request.url();
      if (url.includes('avanza.se/_')) {
        testRequests.push({
          url: url,
          method: request.method(),
          resourceType: request.resourceType(),
          time: new Date().toISOString(),
          endpoint: url.match(/avanza\.se(\/_.+?)(\?|$)/)[1]
        });
      }
    });
    
    // Visit the public home page
    console.log('Visiting public homepage to detect API requests...');
    await testPage.goto('https://www.avanza.se', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait to capture any delayed requests
    await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
    
    // 3. Try to use the search functionality to detect that endpoint
    console.log('\nTesting stock search functionality...');
    try {
      // Try different methods to find and interact with the search box
      // First check if we can find the search field
      const searchSelector = await Promise.race([
        testPage.waitForSelector('input[type="search"]', { timeout: 5000 }),
        testPage.waitForSelector('[data-e2e="search-field"]', { timeout: 5000 }),
        testPage.waitForSelector('input[placeholder*="search" i]', { timeout: 5000 }),
        testPage.waitForSelector('input[placeholder*="sök" i]', { timeout: 5000 })
      ]).catch(() => null);
      
      if (searchSelector) {
        console.log('Found search input field, attempting to search for "Volvo"...');
        
        // Clear previous search requests to isolate new ones
        const searchRequests = [...testRequests]; // Save current requests
        
        // Click and type in the search field
        await searchSelector.click();
        await testPage.keyboard.type('Volvo');
        
        // Wait for search results
        await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
        
        // Check if new requests were made
        const newRequests = testRequests.filter(req => !searchRequests.some(old => old.url === req.url));
        console.log(`Detected ${newRequests.length} API requests during search`);
        
        // Take a screenshot of search results if debug is enabled
        if (options.debug) {
          const searchScreenshotPath = getCrawlerFilePath('test_search.png');
          await testPage.screenshot({ path: searchScreenshotPath, fullPage: true });
          console.log(`Search results screenshot saved to ${searchScreenshotPath}`);
        }
        
        // Look specifically for search endpoint
        const searchEndpoints = newRequests.filter(req => 
          req.url.includes('search') || 
          req.url.includes('suggest') || 
          req.url.toLowerCase().includes('volvo')
        );
        
        if (searchEndpoints.length > 0) {
          console.log('✓ Successfully detected search API requests:');
          searchEndpoints.forEach((req, i) => {
            console.log(`  ${i+1}. ${req.endpoint} (${req.method})`);
          });
          
          // Save the search requests to a file
          const searchRequestsPath = getCrawlerFilePath('search_requests.json');
          fs.writeFileSync(
            searchRequestsPath, 
            JSON.stringify(searchEndpoints, null, 2)
          );
          console.log(`Search requests saved to ${searchRequestsPath}`);
          
          // Compare with the endpoint in constants.js
          const constantsSearchPath = constants.paths.SEARCH_PATH;
          if (constantsSearchPath) {
            console.log(`Current search path in constants.js: ${constantsSearchPath}`);
            
            // Find if any of the detected endpoints match or are newer versions
            const matchingPath = searchEndpoints.find(req => req.endpoint === constantsSearchPath);
            const apiPath = searchEndpoints.find(req => req.endpoint.startsWith('/_api/') && req.endpoint.includes('search'));
            
            if (matchingPath) {
              console.log('✓ Detected search endpoint matches the one in constants.js');
            } else if (apiPath && constantsSearchPath.startsWith('/_mobile/')) {
              console.log('! Potential new API search endpoint detected:');
              console.log(`  Current: ${constantsSearchPath}`);
              console.log(`  Detected: ${apiPath.endpoint}`);
            }
          }
        } else {
          console.log('! No specific search endpoints detected');
        }
      } else {
        console.log('! Could not find search input field');
      }
    } catch (searchError) {
      console.error('Error testing search functionality:', searchError.message);
    }
    
    // Take a test screenshot if debug is enabled
    if (options.debug) {
      const testScreenshotPath = getCrawlerFilePath('test_homepage.png');
      await testPage.screenshot({ path: testScreenshotPath, fullPage: true });
      console.log(`Test screenshot saved to ${testScreenshotPath}`);
    }
    
    // Close the test browser
    await testBrowser.close();
    
    // Check the general results
    console.log(`\nDetected ${testRequests.length} total API requests during test`);
    if (testRequests.length > 0) {
      console.log('✓ Successfully detected API requests');
      console.log('Sample requests:');
      
      // Group requests by endpoint
      const endpoints = {};
      testRequests.forEach(req => {
        if (!endpoints[req.endpoint]) {
          endpoints[req.endpoint] = 0;
        }
        endpoints[req.endpoint]++;
      });
      
      // Show most common endpoints
      console.log('Most common endpoints:');
      Object.entries(endpoints)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([endpoint, count], i) => {
          console.log(`  ${i+1}. ${endpoint} (${count} requests)`);
        });
      
      // Save the test requests to a file
      const testRequestsPath = getCrawlerFilePath('test_requests.json');
      fs.writeFileSync(
        testRequestsPath, 
        JSON.stringify(testRequests, null, 2)
      );
      console.log(`All test requests saved to ${testRequestsPath}`);
    } else {
      console.log('✗ Failed to detect any API requests on public homepage');
      console.log('This might indicate an issue with the request monitoring setup');
    }
  } catch (e) {
    console.error('Error during test request detection:', e.message);
    console.log('✗ Test request detection failed');
  }
  
  console.log('\nProceeding with main crawler...');
  
  // Check if we should skip the login process
  if (options.skipLogin) {
    console.log('Skip-login flag is set, exiting after endpoint detection test');
    return;
  }
  
  // Launch browser
  const browser = await puppeteer.launch({ 
    headless: options.debug ? false : true, // Use headless mode unless in debug mode
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: ['--start-maximized', '--window-size=1920,1080']
  });
  
  console.log(`Browser launched in ${options.debug ? 'visible' : 'headless'} mode`);
  
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  
  // Setup HAR recording if requested
  if (options.record) {
    await client.send('Network.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.startScreencast');
  }
  
  // Set up comprehensive request monitoring
  const requests = [];
  const allEndpoints = {
    api: new Set(),
    mobile: new Set(),
    other: new Set()
  };
  
  // More comprehensive request handling
  const captureRequest = (request) => {
    const url = request.url();
    
    try {
      // Check for any Avanza API URLs
      if (url.includes('avanza.se/') && url.includes('/_')) {
        // Extract the endpoint with a more robust pattern
        const endpointMatch = url.match(/avanza\.se(\/_.+?)(\?|$)/);
        
        if (endpointMatch && endpointMatch[1]) {
          const endpoint = endpointMatch[1];
          const requestInfo = {
            url: url,
            method: request.method(),
            resourceType: request.resourceType(),
            timestamp: new Date().toISOString(),
            endpoint: endpoint,
            headers: request.headers() || {}
          };
          
          // Store in the appropriate collection
          if (endpoint.startsWith('/_api/')) {
            endpoints.api.push(endpoint);
            allEndpoints.api.add(endpoint);
          } else if (endpoint.startsWith('/_mobile/')) {
            endpoints.mobile.push(endpoint);
            allEndpoints.mobile.add(endpoint);
          } else {
            endpoints.other.push(endpoint);
            allEndpoints.other.add(endpoint);
          }
          
          // Save complete request info
          requests.push(requestInfo);
          
          // Debug info for API calls
          if (options.debug && 
              (endpoint.includes('account') || 
               endpoint.includes('overview') || 
               endpoint.includes('search'))) {
            console.log(`Detected API call: ${endpoint} (${request.method()})`);
          }
        }
      }
    } catch (e) {
      console.error('Error processing request:', e.message, url);
    }
  };
  
  // Set up request monitoring
  page.on('request', captureRequest);
  
  // Also capture responses to get request IDs and better monitor API activity
  page.on('response', async response => {
    const url = response.url();
    const request = response.request();
    
    try {
      if (url.includes('avanza.se/') && url.includes('/_')) {
        // Extract the endpoint
        const endpointMatch = url.match(/avanza\.se(\/_.+?)(\?|$)/);
        
        if (endpointMatch && endpointMatch[1]) {
          const endpoint = endpointMatch[1];
          
          // Debug info for important endpoints
          if (options.debug && 
             (endpoint.includes('account') || 
              endpoint.includes('overview') || 
              endpoint.includes('search'))) {
            
            const status = response.status();
            console.log(`API response: ${endpoint} - Status: ${status}`);
            
            // For successful JSON responses, log basic structure
            if (response.headers()['content-type']?.includes('application/json') && 
                status >= 200 && status < 300) {
              try {
                const responseBody = await response.json();
                const bodyPreview = {};
                
                // Extract the structure but not all data
                if (Array.isArray(responseBody)) {
                  bodyPreview.type = 'array';
                  bodyPreview.length = responseBody.length;
                  bodyPreview.sample = responseBody.length > 0 ? 
                    Object.keys(responseBody[0] || {}).slice(0, 5) : [];
                } else if (typeof responseBody === 'object' && responseBody !== null) {
                  bodyPreview.type = 'object';
                  bodyPreview.keys = Object.keys(responseBody).slice(0, 10);
                } else {
                  bodyPreview.type = typeof responseBody;
                }
                
                const responsePath = getCrawlerFilePath(`response_${endpoint.replace(/\//g, '_')}.json`);
                fs.writeFileSync(
                  responsePath, 
                  JSON.stringify(responseBody, null, 2)
                );
                console.log(`Response saved to ${responsePath}`);
              } catch (e) {
                console.log(`Could not parse response JSON:`, e.message);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error processing response:', e.message, url);
    }
  });
  
  try {
    // Navigate directly to the login page
    console.log('Navigating to Avanza login page...');
    await page.goto('https://www.avanza.se/logga-in.html', { 
      waitUntil: 'networkidle2',
      timeout: 60000 // Extend timeout to 60 seconds for initial page load
    });
    
    console.log('Current URL:', await page.url());
    
    // Add a delay to ensure the page is fully loaded
    console.log('Waiting for page to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Accept cookies if the dialog appears
    try {
      await page.waitForSelector('button[data-analytics-name="accept-all-cookies-button"]', { timeout: 5000 });
      await page.click('button[data-analytics-name="accept-all-cookies-button"]');
      console.log('Accepted cookies');
    } catch (e) {
      console.log('No cookie dialog found or already accepted');
    }
    
    // Take a screenshot if in debug mode to see the login page
    if (options.debug) {
      const screenshotPath = getCrawlerFilePath('login_page.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Login page screenshot saved to ${screenshotPath}`);
      
      // Save page content for analysis
      const content = await page.content();
      fs.writeFileSync(getCrawlerFilePath('login_page.html'), content);
      console.log('Login page HTML saved to crawler-files/login_page.html');
    }
    
    // Fill username and password
    console.log('Entering credentials...');
    
    // Add a delay before looking for the form
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take a screenshot to see what's on the page
    const pageScreenshotPath = 'login_page_before_form.png';
    await page.screenshot({ path: pageScreenshotPath, fullPage: true });
    console.log(`Before form screenshot saved to ${pageScreenshotPath}`);
    
    // Print the URL to verify we're on the login page
    console.log('Current URL:', await page.url());
    
    // Look for and click on "Användarnamn" button/label to show the login form
    console.log('Looking for Användarnamn button...');
    try {
      // Try different selectors for the Användarnamn button
      // First capture all text content on the page to help with debugging
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Page text content includes:', pageText.substring(0, 500) + '...');
      
      // Try to find any element containing "Användarnamn" text with more targeted selectors
      const usernameButtonSelector = await page.evaluateHandle(() => {
        // This function runs in the browser context
        // First try to find the username button by its exact content
        const buttonWithText = Array.from(document.querySelectorAll('button, a, span.button-text-wrapper'))
          .find(el => el.innerText && el.innerText.trim() === 'Användarnamn');
        
        if (buttonWithText) return buttonWithText;
        
        // If that fails, look for any elements containing the text
        const elementsWithText = Array.from(document.querySelectorAll('*'))
          .filter(el => 
            el.innerText && 
            el.innerText.includes('Användarnamn') && 
            (el.tagName === 'BUTTON' || el.tagName === 'SPAN' || el.tagName === 'A' || 
             el.tagName === 'DIV' || el.tagName === 'LABEL')
          );
        
        console.log(`Found ${elementsWithText.length} elements containing "Användarnamn"`);
        
        // Prefer clickable elements like buttons, links, or elements with click handlers
        return elementsWithText.find(el => 
          el.tagName === 'BUTTON' || 
          el.tagName === 'A' || 
          el.onclick
        ) || elementsWithText[0];
      });
      
      if (usernameButtonSelector) {
        console.log('Found Användarnamn button, clicking it...');
        
        // Try different approaches to click the element
        try {
          // Try the standard click method first
          await usernameButtonSelector.click().catch(async () => {
            console.log('Standard click failed, trying evaluate...');
            // If that fails, try clicking it in page context
            await page.evaluate(el => {
              // Try to click the element or its ancestor button
              if (el.click) {
                el.click();
              } else if (el.parentElement && el.parentElement.click) {
                el.parentElement.click();
              } else if (el.parentElement && el.parentElement.parentElement && el.parentElement.parentElement.click) {
                el.parentElement.parentElement.click();
              }
            }, usernameButtonSelector);
          });
          
          console.log('Successfully clicked on Användarnamn element');
        } catch (clickError) {
          console.error('Error clicking username button:', clickError.message);
          
          // Try clicking via mouse coordinates
          try {
            // Get bounding box of the element
            const box = await usernameButtonSelector.boundingBox();
            if (box) {
              console.log(`Element bounding box: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
              // Click in the middle of the element
              await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
              console.log('Clicked via mouse coordinates');
            }
          } catch (mouseError) {
            console.error('Mouse click error:', mouseError.message);
          }
        }
        
        // Take screenshot after clicking
        const afterClickScreenshot = getCrawlerFilePath('after_username_button_click.png');
        await page.screenshot({ path: afterClickScreenshot, fullPage: true });
        console.log(`Screenshot after clicking username button saved to ${afterClickScreenshot}`);
        
        // Wait a moment for the form to appear
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error('Could not find or click Användarnamn button:', e.message);
      
      // Try clicking on any button that might be the login option
      try {
        // Try to find any button that might trigger the login form
        const buttons = await page.$$('button');
        console.log(`Found ${buttons.length} buttons on the page`);
        
        for (let i = 0; i < buttons.length; i++) {
          console.log(`Trying to click button ${i+1}...`);
          try {
            await buttons[i].click();
            // Take screenshot after clicking
            const buttonClickPath = getCrawlerFilePath(`button_click_${i+1}.png`);
            await page.screenshot({ path: buttonClickPath, fullPage: true });
            console.log(`Clicked button ${i+1}, screenshot saved to ${buttonClickPath}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if login form appeared
            const formVisible = await page.$('input[name="username"]');
            if (formVisible) {
              console.log(`Login form appeared after clicking button ${i+1}!`);
              break;
            }
          } catch (err) {
            console.log(`Failed to click button ${i+1}:`, err.message);
          }
        }
      } catch (buttonError) {
        console.error('Error finding buttons:', buttonError.message);
      }
    }
    
    // Wait for any form to appear after clicking the login button
    console.log('Waiting for login form...');
    try {
      // Try different possible selectors for the login form with a generous timeout
      await Promise.race([
        page.waitForSelector('form.user-credentials-form.is-visible', { timeout: 15000 }),
        page.waitForSelector('form[method="POST"]', { timeout: 15000 }),
        page.waitForSelector('input[name="username"]', { timeout: 15000 }),
        page.waitForSelector('label.u-label-text', { timeout: 15000 })
      ]);
      
      // Take a screenshot if in debug mode
      if (options.debug) {
        const screenshotPath = getCrawlerFilePath('login_form.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Login form screenshot saved to ${screenshotPath}`);
      }
    } catch (e) {
      console.error('Could not find login form:', e.message);
      // Take a screenshot to see what's on the page
      const screenshotPath = getCrawlerFilePath('login_form_error.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Error screenshot saved to ${screenshotPath}`);
      
      // Let's dump the page content to see what we're dealing with
      const content = await page.content();
      fs.writeFileSync(getCrawlerFilePath('page_content.html'), content);
      console.log('Page HTML content saved to crawler-files/page_content.html');
      
      throw new Error('Could not find login form');
    }
    
    // Find and fill username field with multiple fallback strategies
    console.log('Filling username...');
    try {
      // Look for username input with multiple possible selectors
      await Promise.race([
        page.waitForSelector('input[name="username"][data-e2e="login-user-credentials-username"]', { timeout: 10000 }),
        page.waitForSelector('input[name="username"]', { timeout: 10000 }),
        page.waitForSelector('input[type="text"][placeholder="Användarnamn"]', { timeout: 10000 }),
        page.waitForSelector('#username', { timeout: 10000 })
      ]);
      
      // Try typing the username with different selectors
      try {
        await page.type('input[name="username"][data-e2e="login-user-credentials-username"]', options.username);
      } catch (e) {
        try {
          await page.type('input[name="username"]', options.username);
        } catch (e2) {
          try {
            await page.type('input[type="text"][placeholder="Användarnamn"]', options.username);
          } catch (e3) {
            await page.type('#username', options.username);
          }
        }
      }
      
      console.log('Successfully entered username');
    } catch (e) {
      console.error('Could not enter username:', e.message);
      // Take a screenshot
      await page.screenshot({ path: getCrawlerFilePath('username_error.png'), fullPage: true });
      throw new Error('Could not enter username');
    }
    
    // Find and fill password field with multiple fallback strategies
    console.log('Filling password...');
    try {
      // Look for password input with multiple possible selectors
      await Promise.race([
        page.waitForSelector('input[name="password"][data-e2e="login-user-credentials-password"]', { timeout: 10000 }),
        page.waitForSelector('input[name="password"]', { timeout: 10000 }),
        page.waitForSelector('input[type="password"]', { timeout: 10000 }),
        page.waitForSelector('#password', { timeout: 10000 })
      ]);
      
      // Try typing the password with different selectors
      try {
        await page.type('input[name="password"][data-e2e="login-user-credentials-password"]', options.password);
      } catch (e) {
        try {
          await page.type('input[name="password"]', options.password);
        } catch (e2) {
          try {
            await page.type('input[type="password"]', options.password);
          } catch (e3) {
            await page.type('#password', options.password);
          }
        }
      }
      
      console.log('Successfully entered password');
    } catch (e) {
      console.error('Could not enter password:', e.message);
      // Take a screenshot
      await page.screenshot({ path: getCrawlerFilePath('password_error.png'), fullPage: true });
      throw new Error('Could not enter password');
    }
    
    // Find and click the submit button with multiple fallback strategies
    console.log('Looking for login submit button...');
    try {
      // Look for submit button with multiple possible selectors
      await Promise.race([
        page.waitForSelector('button[type="submit"][data-e2e="login-user-credentials-submit"]', { timeout: 10000 }),
        page.waitForSelector('button[type="submit"]', { timeout: 10000 }),
        page.waitForSelector('form button[type="submit"]', { timeout: 10000 }),
        page.waitForSelector('button.submit-btn', { timeout: 10000 })
      ]);
      
      // Take a screenshot if in debug mode
      if (options.debug) {
        const screenshotPath = getCrawlerFilePath('before_submit_click.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Before submit screenshot saved to ${screenshotPath}`);
      }
      
      // Try clicking the submit button using various selectors
      console.log('Clicking submit button...');
      try {
        // First try to click button with text "Logga in" (often more reliable)
        try {
          await page.click('button[type="submit"]');
          console.log('Clicked submit button with text "Logga in"');
        } catch (ex) {
          try {
            await page.click('button[type="submit"][data-e2e="login-user-credentials-submit"]');
            console.log('Clicked submit button with data-e2e selector');
          } catch (e2) {
            try {
              await page.click('form button[type="submit"]');
              console.log('Clicked submit button within form');
            } catch (e3) {
              await page.click('button[type="submit"]');
              console.log('Clicked generic submit button');
            }
          }
        }
      } catch (e) {
        console.error('Failed to click submit button:', e.message);
        // Take a screenshot to see what's happening
        await page.screenshot({ path: getCrawlerFilePath('submit_button_error.png'), fullPage: true });
        throw new Error('Could not click submit button');
      }
    } catch (e) {
      console.error('Could not find submit button:', e.message);
      // Take a screenshot to see what's on the page
      const screenshotPath = getCrawlerFilePath('find_submit_button_error.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Error screenshot saved to ${screenshotPath}`);
      
      throw new Error('Could not find submit button');
    }
    
    // Handle 2FA - only if needed and only if not in skip-login mode
    if (!options.skipLogin) {
      console.log('Checking if two-factor authentication is required...');
      try {
        // First check if 2FA form is visible before generating TOTP
        const is2FARequired = await page.evaluate(() => {
          return !!document.querySelector('form.verification-code-form, input[name="verificationCode"]');
        });
        
        if (is2FARequired) {
          console.log('Two-factor authentication form detected');
          
          // Check if we have the TOTP secret before trying to generate a code
          if (!options.totpSecret) {
            console.error('TOTP authentication required but no TOTP secret provided');
            throw new Error('TOTP secret missing');
          }
          
          // Only generate TOTP when we actually need it
          const totpCode = totp(options.totpSecret);
          console.log(`Generated TOTP code: ${totpCode}`);
          
          // Find and fill the TOTP input using the exact selector from the HTML
          await page.waitForSelector('input[name="verificationCode"][type="tel"]');
          await page.type('input[name="verificationCode"][type="tel"]', totpCode);
          
          // Wait for the button to become enabled (the "Okej" button in the TOTP form)
          await page.waitForFunction(() => {
            const submitBtn = document.querySelector('form.verification-code-form button[type="submit"][mintbutton][theme="primary"]');
            return submitBtn && !submitBtn.disabled;
          }, { timeout: 5000 });
          
          // Click the button with text "Okej"
          const okejButton = await page.$('form.verification-code-form button[type="submit"] span.button-content');
          if (okejButton) {
            await okejButton.click();
          } else {
            // Fallback if the span isn't found
            await page.click('form.verification-code-form button[type="submit"][mintbutton][theme="primary"]');
          }
          console.log('Submitted TOTP code successfully');
        } else {
          console.log('Two-factor authentication not required - already authenticated');
        }
      } catch (e) {
        console.log('Error handling two-factor authentication:', e.message);
      }
    } else {
      console.log('Skip-login mode active, bypassing 2FA check');
    }
    
    // Wait for dashboard to load
    console.log('Waiting for dashboard to load...');
    try {
      // Wait for elements that indicate successful login
      await Promise.race([
        page.waitForSelector('.account-list', { timeout: 30000 }),
        page.waitForSelector('[data-mint-id="accounts-overview-container"]', { timeout: 30000 }),
        page.waitForSelector('h1', { timeout: 30000 }),
        page.waitForSelector('h2', { timeout: 30000 })
      ]);
      console.log('Successfully logged in!');
    } catch (e) {
      console.error('Failed to detect successful login:', e.message);
      
      // Take a screenshot to help debug login issues
      if (options.debug) {
        const screenshotPath = getCrawlerFilePath('login_debug.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Debug screenshot saved to ${screenshotPath}`);
      }
      
      throw new Error('Failed to login to Avanza');
    }
    
    // Define a comprehensive set of pages to visit to capture all API endpoints
    const pagesToVisit = [
      // Main navigation sections
      { url: '/start', name: 'Dashboard', important: true },
      { url: '/mina-sidor/kontooversikt', name: 'Account Overview', important: true },
      { url: '/mina-sidor/innehav', name: 'Holdings', important: true },
      { url: '/mina-sidor/transaktioner', name: 'Transactions', important: true },
      { url: '/mina-sidor/courtage', name: 'Commissions', important: false },
      
      // Investment pages
      { url: '/aktier-och-derivat', name: 'Stocks', important: true },
      { url: '/fonder/fondtorg', name: 'Funds', important: true },
      { url: '/certifikat', name: 'Certificates', important: false },
      { url: '/optioner', name: 'Options', important: false },
      { url: '/borshandlade-produkter', name: 'ETFs', important: false },
      { url: '/obligationer', name: 'Bonds', important: false },
      
      // Markets
      { url: '/marknader', name: 'Markets', important: true },
      { url: '/marknader/sverige', name: 'Swedish Market', important: true },
      { url: '/marknader/usa', name: 'US Market', important: false },
      { url: '/marknader/europa', name: 'European Market', important: false },
      
      // Personal pages
      { url: '/mina-sidor/bevakningslista', name: 'Watchlists', important: true },
      { url: '/mina-sidor/profil', name: 'Profile', important: false },
      { url: '/mina-sidor/installningar', name: 'Settings', important: false },
      
      // Trading-related
      { url: '/handla/guide', name: 'Trading Guide', important: false },
      { url: '/mina-sidor/aktiehistorik', name: 'Stock History', important: true },
      { url: '/mina-sidor/konto', name: 'Account Details', important: true },
      
      // Information
      { url: '/kundsupport', name: 'Customer Support', important: false },
      { url: '/prislista', name: 'Price List', important: false }
    ];
    
    // Request tracker for key pages
    const keyPageRequests = {
      'Account Overview': [],
      'Dashboard': [],
      'Accounts': []
    };
    
    // Track account overview API requests specifically
    console.log('Setting up tracking for account overview API calls...');
    const accountOverviewRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('avanza.se/_') && 
         (url.includes('account') || url.includes('overview') || url.includes('accounts'))) {
        accountOverviewRequests.push({
          url: url,
          method: request.method(),
          resourceType: request.resourceType(),
          time: new Date().toISOString(),
          endpoint: url.match(/avanza\.se(\/_.+?)(\?|$)/)[1]
        });
      }
    });
    
    // Visit each page in our comprehensive list
    console.log('\nStarting page navigation to capture API endpoints...');
    
    // Organize pages by priority - visit important ones first
    const importantPages = pagesToVisit.filter(p => p.important);
    const otherPages = pagesToVisit.filter(p => !p.important);
    
    // Track which sections have been explored
    const exploredSections = {
      stocks: false,
      funds: false,
      watchlists: false,
      transactions: false
    };
    
    // Function to visit a page and capture its API requests
    async function visitPage(pageInfo) {
      console.log(`Visiting ${pageInfo.name}...`);
      try {
        await page.goto(`https://www.avanza.se${pageInfo.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Take a screenshot for reference
        if (options.debug) {
          const pageScreenshotPath = getCrawlerFilePath(`page_${pageInfo.name.toLowerCase().replace(/\s+/g, '_')}.png`);
          await page.screenshot({ path: pageScreenshotPath, fullPage: true });
          console.log(`${pageInfo.name} screenshot saved to ${pageScreenshotPath}`);
        }
        
        // Wait for any async requests to complete
        await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
        
        // Store requests for key pages
        if (keyPageRequests[pageInfo.name]) {
          keyPageRequests[pageInfo.name] = [...accountOverviewRequests];
        }
        
        return true;
      } catch (e) {
        console.error(`Error visiting ${pageInfo.name}:`, e.message);
        return false;
      }
    }
    
    // First visit all important pages
    console.log('\nVisiting primary pages...');
    for (const pageInfo of importantPages) {
      await visitPage(pageInfo);
      
      // Check for specific sections to explore deeper
      if (pageInfo.url.includes('aktier-och-derivat') && !exploredSections.stocks) {
        await exploreStocksSection(page);
        exploredSections.stocks = true;
      } else if (pageInfo.url.includes('fonder') && !exploredSections.funds) {
        await exploreFundsSection(page);
        exploredSections.funds = true;
      } else if (pageInfo.url.includes('bevakningslista') && !exploredSections.watchlists) {
        await exploreWatchlists(page);
        exploredSections.watchlists = true;
      } else if (pageInfo.url.includes('transaktioner') && !exploredSections.transactions) {
        await exploreTransactions(page);
        exploredSections.transactions = true;
      }
    }
    
    // Then visit less important pages
    if (otherPages.length > 0) {
      console.log('\nVisiting secondary pages...');
      for (const pageInfo of otherPages) {
        await visitPage(pageInfo);
      }
    }
    
    // Function to explore the stocks section more deeply
    async function exploreStocksSection(page) {
      console.log('\nExploring stocks section more deeply...');
      
      try {
        // Try to find and click on a stock
        console.log('Looking for stock links...');
        await page.goto('https://www.avanza.se/aktier/lista.html', { waitUntil: 'networkidle2' });
        
        // Wait for stock list to load
        await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
        
        // Find stock links
        const stockLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/aktier/om-aktien.html/"]')).slice(0, 3);
          return links.map(a => a.getAttribute('href'));
        });
        
        if (stockLinks && stockLinks.length > 0) {
          console.log(`Found ${stockLinks.length} stock links`);
          
          // Visit up to 3 stocks
          for (let i = 0; i < Math.min(stockLinks.length, 3); i++) {
            const stockUrl = stockLinks[i];
            console.log(`Visiting stock ${i+1}/${Math.min(stockLinks.length, 3)}: ${stockUrl}`);
            
            await page.goto(`https://www.avanza.se${stockUrl}`, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
            
            // Open the buy/sell dialog to capture those endpoints
            try {
              // Find buy button using a more compatible approach
              const buyButton = await page.evaluate(() => {
                // Try various selectors that might match the buy button
                const button = 
                  document.querySelector('button[data-e2e="buy-button"]') || 
                  Array.from(document.querySelectorAll('button')).find(el => 
                    el.textContent && el.textContent.trim().includes('Köp')
                  ) ||
                  Array.from(document.querySelectorAll('a')).find(el => 
                    el.textContent && el.textContent.trim().includes('Köp')
                  );
                
                // Mark the button if found
                if (button) {
                  button.setAttribute('data-crawler-target', 'buy-button');
                  return true;
                }
                return false;
              });
              
              if (buyButton) {
                console.log('Found buy button, clicking it...');
                await page.click('[data-crawler-target="buy-button"]');
                await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
                
                // Close the dialog
                try {
                  const closeButtonExists = await page.evaluate(() => {
                    // Try various selectors that might match the close button
                    const button = 
                      document.querySelector('button[aria-label="Close"], button.close-button') || 
                      Array.from(document.querySelectorAll('button')).find(el => 
                        el.textContent && el.textContent.trim().includes('Avbryt')
                      );
                    
                    // Mark the button if found
                    if (button) {
                      button.setAttribute('data-crawler-target', 'close-button');
                      return true;
                    }
                    return false;
                  });
                  
                  // Use the marked button
                  if (closeButtonExists) {
                    const closeButtonElement = await page.$('[data-crawler-target="close-button"]');
                    if (closeButtonElement) {
                      await closeButtonElement.click();
                    }
                  }
                } catch (closeError) {
                  console.log('Could not close buy dialog:', closeError.message);
                }
              }
            } catch (buyError) {
              console.log('Could not click buy button:', buyError.message);
            }
            
            // Visit chart tab to capture chart data endpoints
            try {
              console.log('Checking chart data endpoints...');
              await page.goto(`https://www.avanza.se${stockUrl.replace('om-aktien', 'diagram')}`, { waitUntil: 'networkidle2' });
              await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
            } catch (chartError) {
              console.log('Could not access chart tab:', chartError.message);
            }
          }
        } else {
          console.log('No stock links found');
        }
      } catch (e) {
        console.error('Error exploring stocks section:', e.message);
      }
    }
    
    // Function to explore the funds section more deeply
    async function exploreFundsSection(page) {
      console.log('\nExploring funds section more deeply...');
      
      try {
        // Try to find and click on a fund
        console.log('Looking for fund links...');
        await page.goto('https://www.avanza.se/fonder/lista.html', { waitUntil: 'networkidle2' });
        
        // Wait for fund list to load
        await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
        
        // Find fund links
        const fundLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/fonder/om-fonden.html/"]')).slice(0, 3);
          return links.map(a => a.getAttribute('href'));
        });
        
        if (fundLinks && fundLinks.length > 0) {
          console.log(`Found ${fundLinks.length} fund links`);
          
          // Visit up to 3 funds
          for (let i = 0; i < Math.min(fundLinks.length, 3); i++) {
            const fundUrl = fundLinks[i];
            console.log(`Visiting fund ${i+1}/${Math.min(fundLinks.length, 3)}: ${fundUrl}`);
            
            await page.goto(`https://www.avanza.se${fundUrl}`, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
            
            // Try to open the buy dialog to capture those endpoints
            try {
              // Find buy button using a more compatible approach
              const buyButton = await page.evaluate(() => {
                // Try various selectors that might match the buy button
                const button = 
                  document.querySelector('button[data-e2e="buy-button"]') || 
                  Array.from(document.querySelectorAll('button')).find(el => 
                    el.textContent && el.textContent.trim().includes('Köp')
                  ) ||
                  Array.from(document.querySelectorAll('a')).find(el => 
                    el.textContent && el.textContent.trim().includes('Köp')
                  );
                
                // Mark the button if found
                if (button) {
                  button.setAttribute('data-crawler-target', 'fund-buy-button');
                  return true;
                }
                return false;
              });
              
              if (buyButton) {
                console.log('Found buy button, clicking it...');
                await page.click('[data-crawler-target="fund-buy-button"]');
                await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
                
                // Close the dialog
                try {
                  const closeButtonExists = await page.evaluate(() => {
                    // Try various selectors that might match the close button
                    const button = 
                      document.querySelector('button[aria-label="Close"], button.close-button') || 
                      Array.from(document.querySelectorAll('button')).find(el => 
                        el.textContent && el.textContent.trim().includes('Avbryt')
                      );
                    
                    // Mark the button if found
                    if (button) {
                      button.setAttribute('data-crawler-target', 'close-button');
                      return true;
                    }
                    return false;
                  });
                  
                  // Use the marked button
                  if (closeButtonExists) {
                    const closeButtonElement = await page.$('[data-crawler-target="close-button"]');
                    if (closeButtonElement) {
                      await closeButtonElement.click();
                    }
                  }
                } catch (closeError) {
                  console.log('Could not close buy dialog:', closeError.message);
                }
              }
            } catch (buyError) {
              console.log('Could not click buy button:', buyError.message);
            }
          }
        } else {
          console.log('No fund links found');
        }
      } catch (e) {
        console.error('Error exploring funds section:', e.message);
      }
    }
    
    // Function to explore watchlists more deeply
    async function exploreWatchlists(page) {
      console.log('\nExploring watchlists more deeply...');
      
      try {
        await page.goto('https://www.avanza.se/mina-sidor/bevakningslista.html', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
        
        // Try to find watchlist tabs
        const watchlistTabs = await page.$$('li[role="tab"], button[role="tab"], a[role="tab"]');
        
        if (watchlistTabs && watchlistTabs.length > 0) {
          console.log(`Found ${watchlistTabs.length} watchlist tabs`);
          
          // Click on up to 3 tabs
          for (let i = 0; i < Math.min(watchlistTabs.length, 3); i++) {
            console.log(`Clicking on watchlist tab ${i+1}...`);
            try {
              await watchlistTabs[i].click();
              await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
            } catch (tabError) {
              console.log(`Error clicking tab ${i+1}:`, tabError.message);
            }
          }
        } else {
          console.log('No watchlist tabs found');
        }
        
        // Try to add a stock to watchlist
        try {
          console.log('Looking for add to watchlist button...');
          const addButtonExists = await page.evaluate(() => {
            // Try various selectors that might match the add button
            const button = 
              document.querySelector('button[title*="Lägg till"], button.add-button') || 
              Array.from(document.querySelectorAll('button')).find(el => 
                el.textContent && el.textContent.trim().includes('Lägg till')
              );
            
            // Mark the button if found
            if (button) {
              button.setAttribute('data-crawler-target', 'add-button');
              return true;
            }
            return false;
          });
          
          // Use the marked button
          const addButtonElement = await page.$('[data-crawler-target="add-button"]');
          
          if (addButtonElement) {
            console.log('Clicking add to watchlist button...');
            await addButtonElement.click();
            await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
            
            // Try to close the dialog
            try {
              const closeButtonExists = await page.evaluate(() => {
                // Try various selectors that might match the close button
                const button = 
                  document.querySelector('button[aria-label="Close"], button.close-button') || 
                  Array.from(document.querySelectorAll('button')).find(el => 
                    el.textContent && el.textContent.trim().includes('Avbryt')
                  );
                
                // Mark the button if found
                if (button) {
                  button.setAttribute('data-crawler-target', 'close-button');
                  return true;
                }
                return false;
              });
              
              // Use the marked button
              if (closeButtonExists) {
                const closeButtonElement = await page.$('[data-crawler-target="close-button"]');
                if (closeButtonElement) {
                  await closeButtonElement.click();
                }
              }
            } catch (closeError) {
              console.log('Could not close dialog:', closeError.message);
            }
          } else {
            console.log('No add to watchlist button found');
          }
        } catch (addError) {
          console.log('Error with add to watchlist:', addError.message);
        }
      } catch (e) {
        console.error('Error exploring watchlists:', e.message);
      }
    }
    
    // Function to explore transactions section
    async function exploreTransactions(page) {
      console.log('\nExploring transactions more deeply...');
      
      try {
        await page.goto('https://www.avanza.se/mina-sidor/transaktioner.html', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
        
        // Try to change the date range
        try {
          console.log('Looking for date filter options...');
          
          // Try to click on date filter dropdown
          const dateDropdowns = await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select[name*="date"], select[name*="period"]'));
            const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
              btn.textContent && btn.textContent.trim().includes('Period')
            );
            
            // Mark the elements for later use
            [...selects, ...buttons].forEach((el, i) => {
              el.setAttribute('data-crawler-target', `date-filter-${i}`);
            });
            
            return selects.length + buttons.length;
          });
          
          // Get all elements with our custom attribute
          const dateFilterElements = await page.$$('[data-crawler-target^="date-filter-"]');
          
          if (dateFilterElements.length > 0) {
            console.log('Found date filter, attempting to change period...');
            await dateFilterElements[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to select a different option
            const options = await page.$$('option, li[role="option"]');
            if (options.length > 1) {
              await options[1].click();
              await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
              console.log('Changed transaction period filter');
            }
          } else {
            console.log('No date filter dropdown found');
          }
        } catch (dateError) {
          console.log('Error changing transaction date filter:', dateError.message);
        }
        
        // Try to filter by transaction type
        try {
          console.log('Looking for transaction type filter...');
          const typeFilters = await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select[name*="type"]'));
            const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
              btn.textContent && btn.textContent.trim().includes('Alla transaktioner')
            );
            
            // Mark the elements for later use
            [...selects, ...buttons].forEach((el, i) => {
              el.setAttribute('data-crawler-target', `type-filter-${i}`);
            });
            
            return selects.length + buttons.length;
          });
          
          // Get all elements with our custom attribute
          const typeFilterElements = await page.$$('[data-crawler-target^="type-filter-"]');
          
          if (typeFilterElements.length > 0) {
            console.log('Found transaction type filter, attempting to change...');
            await typeFilterElements[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to select a different option
            const options = await page.$$('option, li[role="option"]');
            if (options.length > 1) {
              await options[1].click();
              await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
              console.log('Changed transaction type filter');
            }
          } else {
            console.log('No transaction type filter found');
          }
        } catch (typeError) {
          console.log('Error changing transaction type filter:', typeError.message);
        }
      } catch (e) {
        console.error('Error exploring transactions section:', e.message);
      }
    }
    
    // Visit individual account pages to capture specific account overview endpoints
    console.log('\nLooking for individual account links...');
    try {
      // Try to find account links on the account overview page
      await page.goto('https://www.avanza.se/mina-sidor/kontooversikt', { waitUntil: 'networkidle2' });
      
      // Try different strategies to find account links
      const accountLinks = await page.evaluate(() => {
        // Find links that might point to individual accounts with more flexible criteria
        const links = Array.from(document.querySelectorAll('a')).filter(a => {
          const href = a.getAttribute('href') || '';
          const text = a.textContent ? a.textContent.trim().toLowerCase() : '';
          
          // More comprehensive check for account-related links
          return (
            href.includes('/konto/') || 
            href.includes('/account/') || 
            href.includes('/depot/') ||
            href.includes('accountId=') ||
            href.includes('depotId=') ||
            href.match(/\/[^\/]+\/\d+/) || // Pattern like /account/12345
            (text && (
              text.includes('konto') || 
              text.includes('isk') ||
              text.includes('depå') ||
              text.includes('sparkonto') ||
              text.includes('pension') ||
              text.includes('portfölj') ||
              // Look for any link with currency formatting, likely an account balance
              text.match(/\d+[\s\xa0]?([0-9]{3}[\s\xa0]?)*([,.]\d+)?(\s?kr|\s?SEK)/)
            ))
          );
        });
        
        console.log(`Found ${links.length} potential account links in DOM`);
        
        // Log the found links for debugging
        links.forEach((a, i) => {
          console.log(`[${i+1}] ${a.getAttribute('href')} - ${a.textContent.trim().substring(0, 30)}`);
        });
        
        return links.map(a => a.getAttribute('href')).filter(href => href);
      });
      
      if (accountLinks && accountLinks.length > 0) {
        console.log(`Found ${accountLinks.length} potential account links`);
        
        // Visit each account page
        for (let i = 0; i < Math.min(accountLinks.length, 5); i++) { // Limit to 5 accounts max
          let accountUrl = accountLinks[i];
          
          // Make sure it's a full URL
          if (!accountUrl.startsWith('http')) {
            accountUrl = `https://www.avanza.se${accountUrl.startsWith('/') ? '' : '/'}${accountUrl}`;
          }
          
          console.log(`Visiting account page ${i+1}/${Math.min(accountLinks.length, 5)}: ${accountUrl}`);
          const accountRequestsBefore = [...accountOverviewRequests];
          
          // Visit the account page
          await page.goto(accountUrl, { waitUntil: 'networkidle2' });
          await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000)); // Wait for async requests
          
          // Take a screenshot for reference
          if (options.debug) {
            const accountScreenshotPath = getCrawlerFilePath(`account_${i+1}.png`);
            await page.screenshot({ path: accountScreenshotPath, fullPage: true });
            console.log(`Account ${i+1} screenshot saved to ${accountScreenshotPath}`);
          }
          
          // Check for new requests
          const newAccountRequests = accountOverviewRequests.filter(req => 
            !accountRequestsBefore.some(old => old.url === req.url)
          );
          
          console.log(`Detected ${newAccountRequests.length} new API requests on account page ${i+1}`);
          
          if (newAccountRequests.length > 0) {
            const accountEndpointsPath = getCrawlerFilePath(`account_${i+1}_endpoints.json`);
            fs.writeFileSync(
              accountEndpointsPath, 
              JSON.stringify(newAccountRequests, null, 2)
            );
            console.log(`Account ${i+1} endpoints saved to ${accountEndpointsPath}`);
            
            // Check for account overview endpoints
            const accountEndpoints = newAccountRequests.filter(req => 
              req.url.includes('/account/') || 
              req.url.includes('/accounts/') || 
              req.url.includes('overview')
            );
            
            if (accountEndpoints.length > 0) {
              console.log('Detected account-specific API endpoints:');
              accountEndpoints.forEach((req, idx) => {
                console.log(`  ${idx+1}. ${req.endpoint} (${req.method})`);
              });
              
              // Check if any endpoints match the expected ones
              const ACCOUNT_OVERVIEW_PATH = constants.paths.ACCOUNT_OVERVIEW_PATH.replace('{0}', '[\\d]+');
              const matchesExisting = accountEndpoints.some(req => {
                const regex = new RegExp(ACCOUNT_OVERVIEW_PATH);
                return regex.test(req.endpoint);
              });
              
              if (matchesExisting) {
                console.log('✓ Detected account endpoint matches the one in constants.js');
              } else {
                console.log('! Account endpoint may have changed. Check the saved endpoints.');
              }
            }
          }
        }
        
        // Save all account-related requests
        const allAccountRequestsPath = getCrawlerFilePath('all_account_requests.json');
        fs.writeFileSync(
          allAccountRequestsPath, 
          JSON.stringify(accountOverviewRequests, null, 2)
        );
        console.log(`All account-related requests saved to ${allAccountRequestsPath}`);
        
        // Compare with constants.js
        const knownAccountPaths = [
          constants.paths.OVERVIEW_PATH,
          constants.paths.ACCOUNT_OVERVIEW_PATH.replace('{0}', '[\\d]+'),
          constants.paths.POSITIONS_PATH
        ];
        
        console.log('\nComparing detected account endpoints with constants.js:');
        knownAccountPaths.forEach(pathPattern => {
          const regex = new RegExp(pathPattern);
          const matchingRequests = accountOverviewRequests.filter(req => {
            return regex.test(req.endpoint);
          });
          
          if (matchingRequests.length > 0) {
            console.log(`✓ Found ${matchingRequests.length} requests matching pattern: ${pathPattern}`);
          } else {
            console.log(`✗ No requests found matching pattern: ${pathPattern}`);
          }
        });
        
        // Check for api vs mobile endpoints
        const apiAccountRequests = accountOverviewRequests.filter(req => req.endpoint.startsWith('/_api/') && req.endpoint.includes('account'));
        const mobileAccountRequests = accountOverviewRequests.filter(req => req.endpoint.startsWith('/_mobile/') && req.endpoint.includes('account'));
        
        if (apiAccountRequests.length > 0 && mobileAccountRequests.length > 0) {
          console.log('! Found both /_api/ and /_mobile/ account endpoints:');
          console.log('API endpoints:');
          apiAccountRequests.slice(0, 3).forEach((req, i) => {
            console.log(`  ${i+1}. ${req.endpoint}`);
          });
          console.log('Mobile endpoints:');
          mobileAccountRequests.slice(0, 3).forEach((req, i) => {
            console.log(`  ${i+1}. ${req.endpoint}`);
          });
        } else if (apiAccountRequests.length > 0) {
          console.log('! All account endpoints use /_api/ format');
        } else if (mobileAccountRequests.length > 0) {
          console.log('! All account endpoints use /_mobile/ format');
        }
      } else {
        console.log('No account links found on the account overview page');
        
        // Fallback - check for account IDs in network requests
        console.log('Trying fallback: Looking for account IDs in network requests...');
        const accountIdsInRequests = [];
        
        // Extract account IDs from requests that might contain them
        for (const req of accountOverviewRequests) {
          if (req.url.includes('account') || req.url.includes('accounts')) {
            const accountIdMatch = req.url.match(/\/account(?:s)?\/(\d+)/);
            if (accountIdMatch && accountIdMatch[1]) {
              const accountId = accountIdMatch[1];
              if (!accountIdsInRequests.includes(accountId)) {
                accountIdsInRequests.push(accountId);
              }
            }
          }
        }
        
        if (accountIdsInRequests.length > 0) {
          console.log(`Found ${accountIdsInRequests.length} account IDs in network requests`);
          
          // Generate account URLs manually
          for (let i = 0; i < Math.min(accountIdsInRequests.length, 3); i++) {
            const accountId = accountIdsInRequests[i];
            console.log(`Visiting account ${i+1} with ID ${accountId}...`);
            const accountUrl = `https://www.avanza.se/mina-sidor/konto/${accountId}`;
            const accountRequestsBefore = [...accountOverviewRequests];
            
            // Visit the account page
            await page.goto(accountUrl, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, parseInt(options.wait) || 3000));
            
            // Take a screenshot if in debug mode
            if (options.debug) {
              const accountScreenshotPath = getCrawlerFilePath(`fallback_account_${i+1}.png`);
              await page.screenshot({ path: accountScreenshotPath, fullPage: true });
              console.log(`Fallback account ${i+1} screenshot saved to ${accountScreenshotPath}`);
            }
            
            // Check for new requests
            const newAccountRequests = accountOverviewRequests.filter(req => 
              !accountRequestsBefore.some(old => old.url === req.url)
            );
            
            console.log(`Detected ${newAccountRequests.length} new API requests on fallback account page ${i+1}`);
            
            // Save requests if any were found
            if (newAccountRequests.length > 0) {
              const accountEndpointsPath = getCrawlerFilePath(`fallback_account_${i+1}_endpoints.json`);
              fs.writeFileSync(
                accountEndpointsPath, 
                JSON.stringify(newAccountRequests, null, 2)
              );
              console.log(`Fallback account ${i+1} endpoints saved to ${accountEndpointsPath}`);
            }
          }
        } else {
          console.log('No account IDs found in network requests either');
        }
      }
    } catch (accountError) {
      console.error('Error accessing account pages:', accountError.message);
    }
    
    // Save HAR file if requested
    if (options.record) {
      try {
        const har = await generateHAR(client, requests);
        // Make sure the path is in the crawler-files directory
        const harPath = options.record.includes('crawler-files') ? 
          options.record : 
          getCrawlerFilePath(path.basename(options.record));
        
        fs.writeFileSync(harPath, JSON.stringify(har, null, 2));
        console.log(`HAR file saved to ${harPath}`);
      } catch (e) {
        console.error('Failed to save HAR file:', e);
      }
    }
    
    // Process and save the results
    processEndpoints(allEndpoints, requests);
    
    // Log out
    console.log('Logging out...');
    await page.goto('https://www.avanza.se/logga-ut');
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
    console.log('Browser closed. Crawling complete.');
  }
}

/**
 * Process collected endpoints and save to file
 * @param {Object} allEndpoints Object containing Sets of unique endpoints
 * @param {Array} requests Array of captured request objects
 */
function processEndpoints(allEndpoints, requests = []) {
  // Ensure allEndpoints exists and has the expected properties
  const validEndpoints = allEndpoints && 
                        typeof allEndpoints === 'object' &&
                        allEndpoints.mobile instanceof Set &&
                        allEndpoints.api instanceof Set &&
                        allEndpoints.other instanceof Set;
                        
  if (validEndpoints) {
    // Use the unique endpoints from allEndpoints set
    endpoints.mobile = [...allEndpoints.mobile];
    endpoints.api = [...allEndpoints.api];
    endpoints.other = [...allEndpoints.other];
  } else {
    console.log('Warning: Invalid allEndpoints object provided to processEndpoints');
    // Create empty arrays to avoid errors
    endpoints.mobile = [];
    endpoints.api = [];
    endpoints.other = [];
  }
  
  // Sort endpoints
  endpoints.mobile.sort();
  endpoints.api.sort();
  endpoints.other.sort();
  
  // Calculate statistics
  const totalEndpoints = endpoints.mobile.length + endpoints.api.length + endpoints.other.length;
  console.log('\nEndpoint Statistics:');
  console.log(`Total unique endpoints: ${totalEndpoints}`);
  console.log(`Mobile endpoints: ${endpoints.mobile.length}`);
  console.log(`API endpoints: ${endpoints.api.length}`);
  console.log(`Other endpoints: ${endpoints.other.length}`);
  
  // Save to file
  fs.writeFileSync(options.output, JSON.stringify({
    mobile: endpoints.mobile,
    api: endpoints.api,
    other: endpoints.other,
    timestamp: new Date().toISOString(),
    totalRequests: requests.length,
    statistics: {
      totalUniqueEndpoints: totalEndpoints,
      mobileEndpoints: endpoints.mobile.length,
      apiEndpoints: endpoints.api.length,
      otherEndpoints: endpoints.other.length
    }
  }, null, 2));
  console.log(`\nEndpoints saved to ${options.output}`);
  
  // Save the full request log for advanced analysis
  const requestsPath = getCrawlerFilePath('all_requests.json');
  fs.writeFileSync(requestsPath, JSON.stringify(requests, null, 2));
  console.log(`Full request log saved to ${requestsPath}`);
  
  // Analyze request distribution by HTTP method
  const methodCounts = {};
  requests.forEach(req => {
    const method = req.method;
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  
  console.log('\nHTTP Method Distribution:');
  Object.entries(methodCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, count]) => {
      console.log(`${method}: ${count} requests`);
    });
  
  // Compare with constants.js if requested
  if (options.compare) {
    compareWithLibrary();
  }
}

/**
 * Compare detected endpoints with those defined in constants.js
 */
function compareWithLibrary() {
  console.log('\nComparing with constants.js:');
  
  const potentialUpdates = [];
  const allDetectedEndpoints = [...endpoints.mobile, ...endpoints.api, ...endpoints.other];
  
  // Find library endpoints that might need to be updated
  Object.keys(libraryEndpoints).forEach(endpoint => {
    // If endpoint starts with /_mobile/ and there's an /_api/ alternative
    if (endpoint.startsWith('/_mobile/')) {
      const constantName = libraryEndpoints[endpoint];
      const apiAlternative = endpoint.replace('/_mobile/', '/_api/');
      
      if (allDetectedEndpoints.includes(apiAlternative)) {
        potentialUpdates.push({
          constant: constantName,
          current: endpoint,
          potential: apiAlternative
        });
      }
    }
  });
  
  if (potentialUpdates.length > 0) {
    console.log('Potential endpoint updates:');
    potentialUpdates.forEach(update => {
      console.log(`- ${update.constant}:`);
      console.log(`  Current: ${update.current}`);
      console.log(`  Potential: ${update.potential}`);
      console.log();
    });
    
    // Write update recommendations to file
    const updatesPath = getCrawlerFilePath('endpoint-updates.json');
    fs.writeFileSync(
      updatesPath, 
      JSON.stringify(potentialUpdates, null, 2)
    );
    console.log(`Update recommendations saved to ${updatesPath}`);
  } else {
    console.log('No potential updates found.');
  }
}

/**
 * Generate HAR file from collected requests
 */
async function generateHAR(client, requests) {
  const entries = [];
  
  for (const request of requests) {
    entries.push({
      _initiator: {
        type: 'script'
      },
      _priority: 'High',
      _resourceType: request.resourceType,
      cache: {},
      request: {
        method: request.method,
        url: request.url,
        httpVersion: 'HTTP/1.1',
        headers: [],
        queryString: [],
        cookies: [],
        headersSize: -1,
        bodySize: -1
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/1.1',
        headers: [],
        cookies: [],
        content: {
          size: 0,
          mimeType: 'application/json'
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
        _transferSize: 0
      },
      serverIPAddress: '127.0.0.1',
      startedDateTime: request.timestamp,
      time: 0,
      timings: {
        blocked: 0,
        dns: -1,
        ssl: -1,
        connect: -1,
        send: 0,
        wait: 0,
        receive: 0,
        _blocked_queueing: 0
      }
    });
  }
  
  return {
    version: '1.2',
    creator: {
      name: 'Avanza API Endpoint Crawler',
      version: '1.0'
    },
    pages: [],
    entries
  };
}

// Run the crawler
crawlAvanza().catch(error => {
  console.error('Error running crawler:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});