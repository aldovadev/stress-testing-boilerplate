
export function createCustomMessagePayload() {
  return {
    title: randomTitle(),
    content: " ",
    settings: {
      displayDurationInSecond: 15,
    },
    templateId: "80742ddd-136c-44c6-a247-d508b831b718",
    fontSettings: {
      size: "EXTRA_LARGE",
      color: "BLACK",
      position: "CENTER",
    },
  };
}


function randomTitle() {
  const adjectives = ["Amazing", "Incredible", "Fantastic", "Spectacular", "Wonderful"];
  const nouns = ["Journey", "Adventure", "Experience", "Story", "Saga"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun} ${Math.floor(Math.random() * 1000)}`;
}
