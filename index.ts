void function main() {
  const args = Bun.argv.slice(2);
  console.log("Hello via Bun!", { args });
}();
