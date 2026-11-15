export const manifest = {
    name: 'hello-world',
    version: '1.0.0',
    category: 'extension',
    description: 'A simple hello world extension for debugging',
    author: 'OrgNote',
    source: { type: 'local' },
};

const helloWorldCommand = {
    command: 'hello-world',
    handler: (api) => {
        api.core.useNotifications().notify({
            message: 'Hello, World!',
            level: 'info',
        });
        api.ui.useModal().closeAll();
    },
    icon: 'sym_o_waving_hand',
    group: 'other',
};

export default {
    onMounted: (api) => {
        api.core.useCommands().add(helloWorldCommand);
        api.utils.logger.info('Hello World extension mounted!');
    },

    onUnmounted: (api) => {
        api.core.useCommands().remove(helloWorldCommand);
        api.utils.logger.info('Hello World extension unmounted!');
    },
};
