const { series, task, watch, src, dest } = require('gulp');
const replace = require('gulp-replace');
const { TARGETS, BUILD_DESTS, TARGETS_BUILD_DESTS, WATCH_GLOBS } = require('./gulp/config');
const { checkRequiredEnvVars, loadEnvFile } = require('./gulp/env');
const copy = require('./gulp/copy');
const css = require('./gulp/css');
const html = require('./gulp/html');
const manifest = require('./gulp/manifest');
const pack = require('./gulp/pack');
const remove = require('./gulp/remove');
const script = require('./gulp/script');
const start = require('./gulp/start');

const taskName = process.argv[2];
const targetName = process.argv.pop();

const targetNames = ['all', ...Object.values(TARGETS)];
if (!targetName || !targetNames.includes(targetName)) {
    console.error(`Pass one of possible target names: "${targetNames.join('", "')}"`);
    process.exit(1);
}

loadEnvFile();
checkRequiredEnvVars(taskName, targetName);

// New task to inject environment variables
const injectEnv = (buildDest) => {
    let stream = src([`${buildDest}/**/*.js`, `${buildDest}/**/*.html`]);

    // Iterate over all environment variables
    for (const [key, value] of Object.entries(process.env)) {
        console.log(`Replacing __${key}__ with ` + JSON.stringify(value));
        stream = stream.pipe(replace(`__${key}__`, JSON.stringify(value)));
    }

    return stream.pipe(dest(buildDest));
};

const createBuildDestSeries = buildDest => {
    return series(
        remove.bind(null, buildDest),
        copy.bind(null, buildDest),
        css.bind(null, buildDest),
        script.bind(null, buildDest),
        html.bind(null, buildDest),
        manifest.bind(null, buildDest),
        injectEnv.bind(null, buildDest) // Add the injectEnv task at the end of the series
    );
};

let buildTasks;
let startTasks;
let packTasks;

if (targetName === 'all') {
    buildTasks = series(
        ...Object.values(BUILD_DESTS).map(buildDest => createBuildDestSeries(buildDest))
    );
    startTasks = series(...Object.values(TARGETS).map(targetName => start.bind(null, targetName)));
    packTasks = series(...Object.values(TARGETS).map(targetName => pack.bind(null, targetName)));
} else {
    buildTasks = createBuildDestSeries(TARGETS_BUILD_DESTS[targetName]);
    startTasks = start.bind(null, targetName);
    packTasks = pack.bind(null, targetName);
}

task('dev', buildTasks);

task('watch', watch.bind(null, WATCH_GLOBS, { ignoreInitial: false }, buildTasks));

task('start', series(buildTasks, startTasks, watch.bind(null, WATCH_GLOBS, buildTasks)));

task('build', buildTasks);

task('pack', series(buildTasks, packTasks));
