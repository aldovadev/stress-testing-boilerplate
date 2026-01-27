
export function createCustomMessagePayload() {
  return {
    title: randomTitle(),
    content: " ",
    settings: {
      displayDurationInSecond: 15,
    },
    templateId: "70478fa0-0f6c-41ee-bfe6-267fe347a0da",
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
