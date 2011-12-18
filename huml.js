(function() {
  var BaseParser, HumlParser, example, parse;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  example = '<!doctype html>\n<html>\n  <head>\n    <title>Bob Loblaw\'s Law Blog\n    <meta \n      http-equiv=Content-Type\n      content=\'text/html; charset=utf-8\'>\n    <link rel=stylesheet type=text/css href=/css/main.css>\n    <script type=text/javascript>\n      console.log(\'hai\')\n  <body>\n    # a comment\n    \\# not a comment<br>\n    a less than sign: \\< <br>\n    some <b>inline</> <span class=shiny>markup</>\n    <div>\n      a div\n    not a div\n    <h1>Section\n    <p>First paragraph\n    <p> Second\n       paragraph\n      with\n     poorly\n      thought-out\n       indenting\n      <ul>\n        <li>turnips\n        <li>partridge\n    <p> Third paragraph\n# todo: \n#   - <br/> instead of <br><br/>\n#   - check and quote attributes on open tags \n#   - ignore blank lines\n#   - non-zero error checking';

  BaseParser = (function() {

    function BaseParser(source) {
      this.source = source;
      this.index = 0;
      this.line = 0;
      this.column = 0;
    }

    BaseParser.prototype.peek = function(length) {
      if (length == null) length = 1;
      return this.source.substr(this.index, length);
    };

    BaseParser.prototype.nextChar = function() {
      if (this.peek() === '\n') {
        this.line += 1;
        this.column = 0;
      } else {
        this.column += 1;
      }
      return this.index += 1;
    };

    BaseParser.prototype.advance = function(amount) {
      var i, _results;
      if (amount == null) amount = 1;
      _results = [];
      for (i = 1; 1 <= amount ? i <= amount : i >= amount; 1 <= amount ? i++ : i--) {
        _results.push(this.nextChar());
      }
      return _results;
    };

    BaseParser.prototype.take = function(re) {
      var result;
      re = new RegExp(re, 'g');
      re.lastIndex = this.index;
      result = re.exec(this.source);
      if ((result != null ? result.index : void 0) === this.index) {
        this.advance(result[0].length);
        return result;
      } else {
        return null;
      }
    };

    BaseParser.prototype.hasMore = function() {
      return this.index < this.source.length;
    };

    BaseParser.prototype.getPosition = function() {
      return {
        line: this.line,
        column: this.column,
        index: this.index
      };
    };

    return BaseParser;

  })();

  HumlParser = (function() {

    __extends(HumlParser, BaseParser);

    function HumlParser(source) {
      this.tagStack = [];
      HumlParser.__super__.constructor.call(this, source);
    }

    HumlParser.prototype.makeToken = function(type, value) {
      return {
        type: type,
        value: value,
        position: this.position
      };
    };

    HumlParser.prototype.parseCloseTag = function() {
      var token;
      token = this.take('[^>]*>');
      return this.closeTag(false);
    };

    HumlParser.prototype.parseWeirdTag = function() {
      var token;
      token = this.take('![^>]*>');
      return this.put('<' + token[0]);
    };

    HumlParser.prototype.parseOpenTag = function() {
      var args, t, tagName;
      tagName = this.take('[a-zA-Z0-9-]+')[0];
      args = this.take('[^>]*>')[0];
      t = this.makeToken('open tag', {
        tagName: tagName,
        args: args
      });
      this.tagStack.push(t);
      return this.put('<' + tagName + args);
    };

    HumlParser.prototype.parseTag = function() {
      this.advance();
      switch (this.peek()) {
        case '/':
          return this.parseCloseTag();
        case '!':
          return this.parseWeirdTag();
        default:
          return this.parseOpenTag();
      }
    };

    HumlParser.prototype.parseWhitespace = function() {
      var space, top;
      space = this.take('(\\s|\n)+');
      this.position = this.getPosition();
      if (space != null) {
        while (true) {
          top = this.tagStack[this.tagStack.length - 1];
          if ((top != null ? top.position.line : void 0) < this.position.line && (top != null ? top.position.column : void 0) >= this.position.column) {
            this.closeTag(top.position.line + 1 < this.position.line);
          } else {
            break;
          }
        }
        return this.put(space[0]);
      }
    };

    HumlParser.prototype.closeTag = function(indent) {
      var i, t, _ref;
      t = this.tagStack.pop();
      if (indent) {
        this.put('\n');
        for (i = 0, _ref = t.position.column; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          this.put(' ');
        }
      }
      return this.put('</' + t.value.tagName + '>');
    };

    HumlParser.prototype.parseText = function() {
      var text;
      text = this.take('[^<\\\\#\n]+');
      return this.put(text[0]);
    };

    HumlParser.prototype.parseComment = function() {
      var comment;
      comment = this.take('#\\s+(.*)');
      return this.put('<!-- ' + comment[1] + ' -->');
    };

    HumlParser.prototype.parseEscape = function() {
      var c;
      this.advance();
      c = this.peek();
      switch (c) {
        case '<':
        case '#':
          this.advance();
          return this.put(c);
        default:
          return this.put('\\');
      }
    };

    HumlParser.prototype.parseSomething = function() {
      this.parseWhitespace();
      if (this.hasMore()) {
        switch (this.peek()) {
          case '<':
            return this.parseTag();
          case '#':
            return this.parseComment();
          case '\\':
            return this.parseEscape();
          default:
            return this.parseText();
        }
      }
    };

    HumlParser.prototype.finish = function() {
      var _results;
      _results = [];
      while (this.tagStack.length > 0) {
        _results.push(this.closeTag(true));
      }
      return _results;
    };

    return HumlParser;

  })();

  parse = function(source) {
    var out, parser;
    parser = new HumlParser(source);
    out = '';
    parser.put = function(token) {
      return out += token;
    };
    while (parser.hasMore()) {
      parser.parseSomething();
    }
    parser.finish();
    return out;
  };

  if (typeof window !== "undefined" && window !== null) {
    $(function() {
      $('#right').val(parse(example));
      return $('#left').val(example).keyup(function() {
        var huml;
        try {
          huml = $('#left').val();
          return $('#right').val(parse(huml));
        } catch (e) {
          return $('#right').val('problem! ' + e.stack);
        }
      });
    });
  } else {
    console.log(parse(example));
  }

}).call(this);
