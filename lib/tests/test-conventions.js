export const TEST_COLLECTIONS = {
  reading: "readingTests",
  writing: "writingTests",
  listening: "listeningTests",
  speaking: "speakingTests",
};

export function getTestCollectionName(testType) {
  return TEST_COLLECTIONS[testType] || "tests";
}

export function buildTestAssetPath({
  testType,
  testId,
  assetGroup,
  fileName,
  timestamp = Date.now(),
}) {
  const safeFileName = String(fileName || "file").replace(/\s+/g, "-");

  return `${getTestCollectionName(testType)}/${testId}/${assetGroup}/${timestamp}-${safeFileName}`;
}
