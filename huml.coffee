example = '''
<!doctype html>
<html>
  <head>
    <title>Bob Loblaw's Law Blog
    <meta 
      http-equiv=Content-Type
      content='text/html; charset=utf-8'>
    <link rel=stylesheet type=text/css href=/css/main.css>
    <script type=text/javascript>
      console.log('hai')
  <body>
    # a comment
    \\# not a comment<br>
    a less than sign: \\< <br>
    some <b>inline</> <span class=shiny>markup</>
    <div>
      a div
    not a div
    <h1>Section
    <p>First paragraph
    <p> Second
       paragraph
      with
     poorly
      thought-out
       indenting
      <ul>
        <li>turnips
        <li>partridge
    <p> Third paragraph
# todo: 
#   - <br/> instead of <br><br/>
#   - check and quote attributes on open tags 
#   - ignore blank lines
#   - non-zero error checking
'''


class BaseParser
  constructor: (@source) ->
    @index = 0
    @line = 0
    @column = 0

  peek: (length = 1) ->
    @source.substr @index, length

  nextChar: ->
    if @peek() is '\n'
      @line += 1
      @column = 0
    else
      @column += 1
    @index += 1

  advance: (amount = 1) ->
    for i in [1..amount]
      @nextChar()

  take: (re) ->
    re = new RegExp re, 'g'
    re.lastIndex = @index
    result = re.exec @source
    if result?.index is @index
      @advance result[0].length
      result
    else
      null

  hasMore: ->
    @index < @source.length
  
  getPosition: ->
    line: @line
    column: @column
    index: @index


class HumlParser extends BaseParser
  constructor: (source) ->
    @tagStack = []
    super source
  
  makeToken: (type, value) ->
    type: type
    value: value
    position: @position

  parseCloseTag: ->
    token = @take '[^>]*>'
    @closeTag false

  parseWeirdTag: ->
    token = @take '![^>]*>'
    @put '<' + token[0]

  parseOpenTag: ->
    tagName = @take('[a-zA-Z0-9-]+')[0]
    args = @take('[^>]*>')[0]
    t = @makeToken 'open tag',
      tagName: tagName
      args: args
    @tagStack.push t
    @put '<' + tagName + args

  parseTag: ->
    @advance()
    switch @peek()
      when '/' then @parseCloseTag() 
      when '!' then @parseWeirdTag()
      else @parseOpenTag()

  parseWhitespace: ->
    space = @take '(\\s|\n)+'
    @position = @getPosition()
    if space?
      loop
        top = @tagStack[@tagStack.length - 1]
        if top?.position.line < @position.line and 
           top?.position.column >= @position.column
          @closeTag top.position.line + 1 < @position.line
        else
          break
      @put space[0]
   
  closeTag: (indent) ->
    t = @tagStack.pop()
    if indent
      @put '\n'
      @put ' ' for i in [0...t.position.column]
    @put '</' + t.value.tagName + '>'

  parseText: ->
    text = @take '[^<\\\\#\n]+'
    @put text[0]
    
  parseComment: ->
    comment = @take '#\\s+(.*)'
    @put '<!-- ' + comment[1] + ' -->'

  parseEscape: ->
    @advance()
    c = @peek()
    switch c
      when '<', '#'
        @advance()
        @put c
      else
        @put '\\'

  parseSomething: ->
    @parseWhitespace()
    if @hasMore()
      switch @peek()
        when '<' then @parseTag()
        when '#' then @parseComment()
        when '\\' then @parseEscape()
        else @parseText()

  finish: ->
    @closeTag true while @tagStack.length > 0


parse = (source) ->
  parser = new HumlParser source
  out = ''
  parser.put = (token) -> out += token
  parser.parseSomething() while parser.hasMore()
  parser.finish()
  out


if window?
  $ ->
    $('#right').val parse example
    $('#left').val(huml).keyup ->
      try
        huml = $('#left').val()
        $('#right').val parse huml
      catch e
        $('#right').val 'problem! ' + e.stack
else
  console.log parse example
