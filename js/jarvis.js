const knowledge = [
  { title: "Market-data provider contract", type: "Architecture", summary: "Defines the approved data-source boundary and normalized candle format." },
  { title: "Watch Zone rules", type: "Signal logic", summary: "Documents the transparent conditions used by the paper-research dashboard." },
  { title: "Paper portfolio constraints", type: "Safety", summary: "Virtual funds only; no brokerage connection or live order execution." },
  { title: "Agent permission model", type: "Security", summary: "Agents request only scoped records and receive an auditable context bundle." },
  { title: "Product roadmap", type: "Planning", summary: "Lists prototype milestones, data integrations, and persistence requirements." }
];

const search = document.getElementById("knowledge-search");
const results = document.getElementById("knowledge-results");
const count = document.getElementById("search-count");
const briefTitle = document.getElementById("brief-title");
const briefCopy = document.getElementById("brief-copy");
const briefSource = document.getElementById("brief-source");
const dialog = document.getElementById("request-dialog");

function renderKnowledge(query = "") {
  const matches = knowledge.filter(item => `${item.title} ${item.type} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  count.textContent = `${matches.length} records`;
  document.getElementById("record-count").textContent = knowledge.length;
  results.replaceChildren(...matches.map(item => {
    const row = document.createElement("article");
    row.className = "knowledge-item";
    row.innerHTML = `<div><strong>${item.title}</strong><span>${item.type}</span></div><p>${item.summary}</p>`;
    return row;
  }));
}

function showRequest() {
  dialog.showModal();
  document.getElementById("request-input").focus();
}

search.addEventListener("input", () => renderKnowledge(search.value));
document.getElementById("new-request").addEventListener("click", showRequest);
document.getElementById("ask-agent").addEventListener("click", showRequest);
document.getElementById("submit-request").addEventListener("click", event => {
  event.preventDefault();
  const request = document.getElementById("request-input").value.trim() || "General knowledge review";
  briefTitle.textContent = "Research request queued";
  briefCopy.textContent = `The selected agent will receive a scoped sample context bundle for: ${request}`;
  briefSource.textContent = `${knowledge.length} local sample sources selected`;
  dialog.close();
});
renderKnowledge();
