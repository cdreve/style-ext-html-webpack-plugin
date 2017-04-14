/* eslint-env jasmine */
'use strict';

const rimraf = require('rimraf');
const path = require('path');
const version = require('./helpers/versions');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const StyleExtHtmlWebpackPlugin = require('../index.js');
const mainTests = require('./helpers/main-tests.js');
const testPlugin = require('./helpers/core-test.js');

const OUTPUT_DIR = path.join(__dirname, '../dist');

const baseConfig = (entry, cssFilename, cssLoaders, position) => {
  cssFilename = cssFilename || 'styles.css';
  cssLoaders = cssLoaders || ['css-loader'];
  position = position || 'head-bottom';
  return {
    entry: path.join(__dirname, `fixtures/${entry}.js`),
    output: {
      path: OUTPUT_DIR,
      filename: 'index_bundle.js'
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: false
      }),
      new ExtractTextPlugin(cssFilename),
      new StyleExtHtmlWebpackPlugin({
        position: position
      })
    ],
    module: {
      loaders: [
        {
          test: /\.css$/,
          loader: version.extractTextLoader(ExtractTextPlugin, cssLoaders)
        }
      ]
    }
  };
};

const multiEntryConfig = (position) => {
  position = position || 'head-bottom';
  const page1Extract = new ExtractTextPlugin('page1.css');
  const page2Extract = new ExtractTextPlugin('page2.css');
  const page1Loader = version.extractTextLoader(page1Extract, ['css-loader']);
  const page2Loader = version.extractTextLoader(page2Extract, ['css-loader']);
  const config = baseConfig('');
  config.entry = {
    page1: path.join(__dirname, 'fixtures/page1/script.js'),
    page2: path.join(__dirname, 'fixtures/page2/script.js')
  };
  config.output.filename = '[name].js';
  config.module.loaders = [
    {
      test: /\.css$/,
      loader: page1Loader,
      include: [
        path.resolve(__dirname, 'fixtures/page1')
      ]
    },
    {
      test: /\.css$/,
      loader: page2Loader,
      include: [
        path.resolve(__dirname, 'fixtures/page2')
      ]
    }
  ];
  config.plugins = [
    new HtmlWebpackPlugin({
      inject: false,
      chunks: ['page1'],
      filename: 'page1.html'
    }),
    new HtmlWebpackPlugin({
      inject: false,
      chunks: ['page2'],
      filename: 'page2.html'
    }),
    page1Extract,
    page2Extract,
    new StyleExtHtmlWebpackPlugin({
      position: position,
      chunks: ['page1']
    }),
    new StyleExtHtmlWebpackPlugin({
      position: position,
      chunks: ['page2']
    })
  ];
  return config;
};

const baseExpectations = () => {
  return {
    html: [],
    js: [],
    files: [],
    not: {
      html: [],
      js: [],
      files: ['styles.css']
    }
  };
};

const multiEntryExpectations = () => {
  const expected1 = baseExpectations();
  expected1.html = [
    /<style>[\s\S]*background: snow;[\s\S]*<\/style>/
  ];
  expected1.not.html = [
    /<style>[\s\S]*\u0040import url\(https:\/\/fonts.googleapis.com\/css\?family=Indie\+Flower[\s\S]*<\/style>/,
    /<style>[\s\S]*colour: grey;[\s\S]*<\/style>/,
    /<style>[\s\S]*\[contenteditable='true'][\s\S]*<\/style>/
  ];
  const expected2 = baseExpectations();
  expected2.html = [
    /<style>[\s\S]*\u0040import url\(https:\/\/fonts.googleapis.com\/css\?family=Indie\+Flower[\s\S]*<\/style>/,
    /<style>[\s\S]*colour: grey;[\s\S]*<\/style>/,
    /<style>[\s\S]*\[contenteditable='true'][\s\S]*<\/style>/
  ];
  expected2.not.html = [
    /<style>[\s\S]*background: snow;[\s\S]*<\/style>/
  ];
  const entries = [
    {
      htmlFile: 'page1.html',
      expected: expected1
    },
    {
      htmlFile: 'page2.html',
      expected: expected2
    }
  ];
  return entries;
};

describe(`Explicitly Setting Position (webpack ${version.webpack})`, () => {
  beforeEach((done) => {
    rimraf(OUTPUT_DIR, done);
  });

  mainTests(baseConfig, baseExpectations, multiEntryConfig, multiEntryExpectations);

  it('positions correctly at bottom of head', done => {
    const config = baseConfig('one_stylesheet', null, null, 'head-bottom');
    const expected = baseExpectations();
    expected.html = [
      /<style>[\s\S]*background: snow;[\s\S]*<\/style><\/head>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly at top of head', done => {
    const config = baseConfig('one_stylesheet', null, null, 'head-top');
    const expected = baseExpectations();
    expected.html = [
      /<head><style>[\s\S]*background: snow;[\s\S]*<\/style>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly at bottom of body', done => {
    const config = baseConfig('one_stylesheet', null, null, 'body-bottom');
    const expected = baseExpectations();
    expected.html = [
      /<style>[\s\S]*background: snow;[\s\S]*<\/style><\/body>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly at top of body', done => {
    const config = baseConfig('one_stylesheet', null, null, 'body-top');
    const expected = baseExpectations();
    expected.html = [
      /<body><style>[\s\S]*background: snow;[\s\S]*<\/style>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly at the top of the html block', done => {
    const config = baseConfig('one_stylesheet', null, null, 'absolute-top');
    const expected = baseExpectations();
    expected.html = [
      /<style>[\s\S]*background: snow;[\s\S]*<\/style><!DOCTYPE html>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly multiple stylesheets from a single source at the top of the html block', done => {
    const config = baseConfig('two_stylesheets', 'styles.css', ['css-loader', 'postcss-loader'], 'absolute-top');
    const expected = baseExpectations();
    expected.html = [
      /<style>[\s\S]*background: snow;[\s\S]*color: gray;[\s\S]*<\/style><!DOCTYPE html>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly multiple stylesheets from multiple sources at the top of the html block', done => {
    const config = baseConfig('nested_stylesheets', 'styles.css', ['css-loader', 'postcss-loader'], 'absolute-top');
    const expected = baseExpectations();
    expected.html = [
      /<style>[\s\S]*background: snow;[\s\S]*color: gray;[\s\S]*<\/style><!DOCTYPE html>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly at the bottom of the html block', done => {
    const config = baseConfig('one_stylesheet', null, null, 'absolute-bottom');
    const expected = baseExpectations();
    expected.html = [
      /<\/html><style>[\s\S]*background: snow;[\s\S]*<\/style>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly multiple stylesheets from a single source at the bottom of the html block', done => {
    const config = baseConfig('two_stylesheets', 'styles.css', ['css-loader', 'postcss-loader'], 'absolute-bottom');
    const expected = baseExpectations();
    expected.html = [
      /<\/html><style>[\s\S]*background: snow;[\s\S]*color: gray;[\s\S]*<\/style>/
    ];
    testPlugin(config, expected, done);
  });

  it('positions correctly multiple stylesheets from multiple sources at the bottom of the html block', done => {
    const config = baseConfig('nested_stylesheets', 'styles.css', ['css-loader', 'postcss-loader'], 'absolute-bottom');
    const expected = baseExpectations();
    expected.html = [
      /<\/html><style>[\s\S]*background: snow;[\s\S]*color: gray;[\s\S]*<\/style>/
    ];
    testPlugin(config, expected, done);
  });
});
