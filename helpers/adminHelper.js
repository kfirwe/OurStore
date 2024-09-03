// Helper function to apply filters and sorting
function applyFiltersAndSorting(model, query, fields) {
  const filters = {};
  const sort = {};

  fields.forEach((field) => {
    if (query[field]) {
      filters[field] = new RegExp(query[field], "i"); // case-insensitive search
    }
  });

  if (query.sortBy && query.order) {
    sort[query.sortBy] = query.order === "asc" ? 1 : -1;
  }

  return model.find(filters).sort(sort);
}

module.exports = applyFiltersAndSorting;
