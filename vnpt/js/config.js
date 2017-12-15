requirejs.config({
    baseUrl: 'js/vendor',
    paths: {
        app: '../app',
        pages: '../pages',
        plugins: '../plugins'
    },
    shim: {
        backbone: {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        underscore: {
            exports: '_'
        }
    }
});