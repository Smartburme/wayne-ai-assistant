const baseURL = "/api";
const input = document.getElementById("input");
const form = document.getElementById("form");
const resultBox = document.getElementById("result");
const model = document.getElementById("model");

form.onsubmit = async (e) => {
  e.preventDefault();

  const prompt = input.value.trim();
  if (!prompt) return;

  const selectedModel = model.value;
  resultBox.innerHTML = `<p><strong>Prompt:</strong> ${prompt}</p><p>⏳ Loading...</p>`;
  input.value = "";

  try {
    let res;
    if (selectedModel.startsWith("openai-")) {
      res = await fetch(`${baseURL}/openai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel.replace("openai-", ""),
          prompt
        }),
      });
    } else if (selectedModel.startsWith("gemini-")) {
      res = await fetch(`${baseURL}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel.replace("gemini-", ""),
          prompt
        }),
      });
    } else if (selectedModel.startsWith("stability-")) {
      res = await fetch(`${baseURL}/stability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt
        }),
      });
    } else {
      throw new Error("Unknown model selected");
    }

    if (!res.ok) throw new Error("API Error");

    const data = await res.json();
    displayResult(data, selectedModel);
  } catch (err) {
    resultBox.innerHTML += `<p style="color:red;">❌ Error: ${err.message}</p>`;
  }
};

function displayResult(data, model) {
  resultBox.innerHTML += `<hr/>`;

  if (model.startsWith("stability-") && data.image) {
    const img = document.createElement("img");
    img.src = data.image;
    img.alt = "Generated image";
    img.style.maxWidth = "100%";
    resultBox.appendChild(img);
  } else if (data.text) {
    const p = document.createElement("p");
    p.textContent = data.text;
    resultBox.appendChild(p);
  } else {
    resultBox.innerHTML += `<p>✅ Done, but no output received.</p>`;
  }
}
