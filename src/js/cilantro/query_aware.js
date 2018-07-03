

define([
    'jquery'
    //'d3',
    //'venn'
], function($) {

    testFunction = function() {
        console.log('Query aware is loaded');
    }

    

    checkQueryAware = function() {
        return $('#set-query-aware').hasClass('btn-primary');
        console.log('check query aware');
    }




    return {
        testFunction: testFunction,
        checkQueryAware: checkQueryAware,
    }
});
