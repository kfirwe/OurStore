// Helper function to recursively convert Maps to plain objects
function mapToObject(map) {
  const obj = {};
  map.forEach((value, key) => {
    // If the value is a Map, recursively convert it
    if (value instanceof Map) {
      obj[key] = mapToObject(value);
    } else {
      obj[key] = value;
    }
  });
  return obj;
}

module.exports = mapToObject;
