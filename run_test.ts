import { loginApi, getMenuItems } from "./src/api/service";

async function test() {
  try {
    const user = await loginApi({ username: "customer", password: "customer123" });
    console.log("Logged in");
    const items = await getMenuItems({ available: true });
    console.log("Items:", items);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
