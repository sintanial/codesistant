import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import OpenAI from 'openai';
import {throttle} from 'lodash';
import {getDBSchema, getFetcher, getFilesContent} from "./util";
import {Fetch} from "openai/core";

const DefaultModel = 'gpt-4o';
const DefaultSystemPrompt = `Below are snippets of code from the same project. Help the user complete the parts of the project they request based on the existing code. Adhere to the same style, structure, and approaches.`;
const DefaultThrottle = 2000; // Default throttle value in milliseconds

type Config = {
    proxy: string,
    openai: string,
    model?: string,
    prompt?: string,
    files: string[],
    assistant?: string,
    throttle: number,
    dburl?: string
}

// Default config values
const configTemplate: Config = {
    proxy: '<optional proxy url>',
    openai: '<required openai api key>',
    assistant: '<required assistant id in openai>',
    model: DefaultModel,
    prompt: DefaultSystemPrompt,
    files: [
        './example/path/to/dir/watch',
        './support/**/glob/templates',
        './example/**/somedir/*.js'
    ],
    throttle: DefaultThrottle,
    dburl: '<optional database connection url>'
};

// Parsing command line arguments
const argv = yargs(hideBin(process.argv))
    .command('init', 'Create a default config.yml in the current directory', () => {
    }, (argv) => {
        fs.writeFileSync('./config.yml', yaml.dump(configTemplate));
        console.log('Default config.yml created successfully.');
    })
    .command('watch', 'Start the watch process', () => {
    }, (argv) => {
        startWatchProcess(argv);
    })
    .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to the config file',
        default: './config.yml',
    })
    .option('proxy', {
        type: 'string',
        description: 'Proxy URL',
        default: process.env.PROXY,
    })
    .option('openai', {
        type: 'string',
        description: 'OpenAI API Key',
        default: process.env.OPENAI_KEY,
    })
    .option('assistant', {
        type: 'string',
        description: 'OpenAI assistant ID',
    })
    .option('model', {
        type: 'string',
        description: 'OpenAI model to use',
        default: DefaultModel,
    })
    .option('prompt', {
        type: 'string',
        description: 'System prompt',
        default: DefaultSystemPrompt,
    })
    .option('files', {
        type: 'array',
        description: 'List of files and directories to watch',
    })
    .option('throttle', {
        type: 'number',
        description: 'Throttle value in milliseconds',
        default: DefaultThrottle,
    })
    .option('dburl', {
        type: 'string',
        description: 'Database connection URL for MySQL or PostgreSQL',
    })
    .help()
    .argv;

function startWatchProcess(argv) {
    // Чтение конфигурационного файла
    const configFile = argv.config;
    let config: Config;

    try {
        config = yaml.load(fs.readFileSync(configFile, 'utf8')) as Config;
    } catch (e) {
        console.error(`Failed to read or parse the config file: ${configFile}`, e);
        process.exit(1);
    }

    // Check required parameters
    const openaiKey = argv.openai || config.openai;
    const proxyUrl = argv.proxy || config.proxy;
    const model = argv.model || config.model || DefaultModel;
    const files = argv.files || config.files;
    const assistantId = argv.assistant || config.assistant;
    const systemPrompt = argv.prompt || config.prompt;
    const throttleValue = argv.throttle || config.throttle || DefaultThrottle;
    const dbUrl = argv.dburl || config.dburl;

    if (dbUrl && !dbUrl.startsWith('postgres://') && !dbUrl.startsWith('mysql://')) {
        console.error(`Invalid database url, supported mysql and postgres only`);
        process.exit(1);
    }

    if (!openaiKey || !files || files.length === 0 || !assistantId || !systemPrompt || !dbUrl) {
        console.error('OPENAI_KEY, список файлов, assistant, prompt и dburl обязательны');
        process.exit(1);
    }

    const openai = new OpenAI({
        apiKey: openaiKey,
        fetch: getFetcher({proxyUrl: proxyUrl}) as unknown as Fetch,
    });

    async function updateAssistant(action: string, filePath: string, targets: string[]) {
        console.log("Try to upgrade assistant");

        let prompt = `${systemPrompt}\n\n`;

        if (dbUrl) {
            const sqlDump = await getDBSchema(dbUrl);
            if (sqlDump) {
                prompt += `${sqlDump}\n\n`;
            }
        }

        const fileContents = await getFilesContent(targets);
        prompt += fileContents.join("\n\n");

        await openai.beta.assistants.update(
            assistantId,
            {
                instructions: prompt,
                name: "Game Code Generator",
                tools: [],
                model: model
            }
        );
    }

    // Use lodash throttle to throttle the updateAssistant call
    const throttledUpdateAssistant = throttle(updateAssistant, throttleValue);

    async function main() {
        const watcher = chokidar.watch(files, {});

        watcher
            .on('add', p => throttledUpdateAssistant('add', p, files))
            .on('change', p => throttledUpdateAssistant('change', p, files))
            .on('unlink', p => throttledUpdateAssistant('unlink', p, files));

        // Periodically update the assistant with the database schema
        setInterval(() => throttledUpdateAssistant('dbwatch', '', files), 30000);

        // Keep the process running indefinitely by listening for the SIGINT signal
        process.stdin.resume(); // Prevents the process from exiting
        process.on('SIGINT', () => {
            console.log("Process interrupted, exiting...");
            process.exit(1);
        });
    }

    main().finally(() => {
    });
}
