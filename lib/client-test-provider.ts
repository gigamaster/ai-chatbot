"use client";

/**
 * Test provider connectivity by sending a simple OpenAI-compatible request
 * @param providerConfig - The provider configuration to test
 * @returns Test result with success status and message
 */
export async function testProviderConnection(providerConfig: any) {
  try {
    // Validate required fields first
    if (!providerConfig.baseUrl || !providerConfig.apiKey) {
      return {
        success: false,
        error: "Base URL and API key are required for testing",
      };
    }

    // Determine the model to use for testing
    const model = providerConfig.model || "gemini-2.0-flash"; // Default to a common model

    // Prepare the request payload - matching the exact format from the example
    const payload = {
      model,
      messages: [{ role: "user", content: 'Test connection: return "ok"' }],
      max_tokens: 5,
      stream: false,
    };

    // Prepare the headers - matching the exact format from the example
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerConfig.apiKey}`,
    };

    // Use the provider's base URL as-is without modification
    // Split the URL construction for clarity and to follow provider documentation
    const baseUrl = providerConfig.baseUrl;
    const chatCompletionsPath = "chat/completions";
    const url = baseUrl.endsWith("/")
      ? `${baseUrl}${chatCompletionsPath}`
      : `${baseUrl}/${chatCompletionsPath}`;

    // Send the request - matching the exact approach from the example
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Provide user-friendly error messages - matching the exact approach from the example
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = "Authentication Failed (401). Check your API Key.";
      } else if (response.status === 404) {
        errorMessage = "Not Found (404). Check the Base URL and Model Name.";
      } else if (errorText.includes("API key")) {
        errorMessage = "Invalid API key";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const responseData = await response.json();

    // Check if we got a valid response - matching the exact approach from the example
    if (responseData.choices && responseData.choices.length > 0) {
      return {
        success: true,
        message: "Connection successful! Model responded.",
      };
    }
    return {
      success: false,
      error: "Connection successful, but received an empty response.",
    };
  } catch (error: any) {
    // Provide user-friendly error messages - matching the exact approach from the example
    let errorMessage = "An unknown error occurred.";

    if (error.status === 401) {
      errorMessage = "Authentication Failed (401). Check your API Key.";
    } else if (error.status === 404) {
      errorMessage = "Not Found (404). Check the Base URL and Model Name.";
    } else if (
      error.code === "EADDRNOTAVAIL" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND"
    ) {
      errorMessage = "Network Error. Could not reach the Base URL.";
    } else if (error.message?.includes("API key")) {
      errorMessage = "Invalid API key";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: `Connection Failed: ${errorMessage}`,
    };
  }
}
