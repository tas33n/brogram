const fs = require("fs");
const path = require("path");

function loadBuiltIns() {
  return {
    reels: require("./reels"),
    like: require("./like"),
    comment: require("./comment"),
    share: require("./share")
  };
}

class TaskRunner {
  constructor(map, logger) {
    this.map = map;
    this.logger = logger;
  }
  register(task) { this.map[task.name] = task; }
  async run(page, names, ctx) {
    for (const name of names) {
      const t = this.map[name];
      if (!t) { this.logger.warn("task_missing", { name }); continue; }
      this.logger.info("task_start", { name });

      // Hold auto-scroll during task work
      const ctrl = ctx.control && ctx.control.scroll ? ctx.control.scroll : null;
      if (ctrl) { ctrl.holds = (ctrl.holds || 0) + 1; ctrl.hold = true; }

      try {
        await t.run(page, ctx);
        this.logger.info("task_end", { name, status: "ok" });
      } catch (err) {
        this.logger.error("task_error", { name, error: String(err && err.stack || err) });
        this.logger.info("task_end", { name, status: "error" });
      } finally {
        if (ctrl) { ctrl.holds = Math.max(0, (ctrl.holds || 1) - 1); ctrl.hold = ctrl.holds > 0; }
      }
    }
  }
}

function discover(dir, runner) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    if (f === "index.js") continue;
    try {
      const mod = require(path.join(dir, f));
      if (mod && mod.name && typeof mod.run === "function") runner.register(mod);
    } catch {}
  }
}

module.exports = (logger) => {
  const runner = new TaskRunner(loadBuiltIns(), logger);
  discover(__dirname, runner);
  return runner;
};
