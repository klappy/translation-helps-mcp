/**
 * Test the resource mapping logic
 */

// Simulate the resource type equivalents mapping
const resourceTypeEquivalents = {
  ult: ["ult", "glt"],
  glt: ["ult", "glt"],
  ust: ["ust", "gst"],
  gst: ["ust", "gst"],
  t4t: ["t4t"],
  ueb: ["ueb"],
};

// Test resources (simulating catalog results)
const testResources = [
  { name: "en_ult" },
  { name: "en_ust" },
  { name: "es-419_glt" },
  { name: "es-419_gst" },
  { name: "en_t4t" },
];

function testMapping(version) {
  const requestedTypes = version
    ? resourceTypeEquivalents[version.toLowerCase()] || [version.toLowerCase()]
    : null;

  const matches = testResources.filter((r) => {
    if (!version) return true;
    if (!requestedTypes) return r.name.endsWith(`_${version}`);
    return requestedTypes.some((type) => r.name.endsWith(`_${type}`));
  });

  console.log(`Version: ${version || "all"}`);
  console.log(
    `  Requested types: ${requestedTypes ? requestedTypes.join(", ") : "all"}`,
  );
  console.log(`  Matches: ${matches.map((r) => r.name).join(", ")}`);
  console.log("");
}

console.log("🧪 Testing Resource Type Mapping\n");

testMapping("ult");
testMapping("ust");
testMapping("glt");
testMapping("gst");
testMapping(null);

console.log("✅ Mapping test complete!");
