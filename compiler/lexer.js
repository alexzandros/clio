/*
    https://github.com/SAP/chevrotain/blob/master/examples/lexer/python_indentation/python_indentation.js
    ^ I took the python example and modified it for clio
*/
const { createToken, createTokenInstance, Lexer } = require("chevrotain")
const _ = require("lodash")

// State required for matching the indentations
let indentStack = [0]

/**
 * This custom Token matcher uses Lexer context ("matchedTokens" and "groups" arguments)
 * combined with state via closure ("indentStack" and "lastTextMatched") to match indentation.
 *
 * @param {string} text - the full text to lex, sent by the Chevrotain lexer.
 * @param {number} offset - the offset to start matching in the text.
 * @param {IToken[]} matchedTokens - Tokens lexed so far, sent by the Chevrotain Lexer.
 * @param {object} groups - Token groups already lexed, sent by the Chevrotain Lexer.
 * @param {string} type - determines if this function matches Indent or Outdent tokens.
 * @returns {*}
 */
function matchIndentBase(text, offset, matchedTokens, groups, type) {
    const noTokensMatchedYet = _.isEmpty(matchedTokens)
    const newLines = groups.nl
    const noNewLinesMatchedYet = _.isEmpty(newLines)
    const isFirstLine = noTokensMatchedYet && noNewLinesMatchedYet
    const isStartOfLine =
        // only newlines matched so far
        (noTokensMatchedYet && !noNewLinesMatchedYet) ||
        // Both newlines and other Tokens have been matched AND the last matched Token is a newline
        (!noTokensMatchedYet &&
            !noNewLinesMatchedYet &&
            (!_.isEmpty(newLines) &&
                !_.isEmpty(matchedTokens) &&
                _.last(newLines).startOffset) >
            _.last(matchedTokens).startOffset)

    // indentation can only be matched at the start of a line.
    if (isFirstLine || isStartOfLine) {
        let match
        let currIndentLevel = undefined

        const wsRegExp = / +/y
        wsRegExp.lastIndex = offset
        match = wsRegExp.exec(text)
        // possible non-empty indentation
        if (match !== null) {
            currIndentLevel = match[0].length
        }
        // "empty" indentation means indentLevel of 0.
        else {
            currIndentLevel = 0
        }

        const prevIndentLevel = _.last(indentStack)
        // deeper indentation
        if (currIndentLevel > prevIndentLevel && type === "indent") {
            indentStack.push(currIndentLevel)
            return match
        }
        // shallower indentation
        else if (currIndentLevel < prevIndentLevel && type === "outdent") {
            const matchIndentIndex = _.findLastIndex(
                indentStack,
                stackIndentDepth => stackIndentDepth === currIndentLevel
            )

            // any outdent must match some previous indentation level.
            if (matchIndentIndex === -1) {
                throw Error(`invalid outdent at offset: ${offset}`)
            }

            const numberOfDedents = indentStack.length - matchIndentIndex - 1

            // This is a little tricky
            // 1. If there is no match (0 level indent) than this custom token
            //    matcher would return "null" and so we need to add all the required outdents ourselves.
            // 2. If there was match (> 0 level indent) than we need to add minus one number of outsents
            //    because the lexer would create one due to returning a none null result.
            let iStart = match !== null ? 1 : 0
            for (let i = iStart; i < numberOfDedents; i++) {
                indentStack.pop()
                matchedTokens.push(
                    createTokenInstance(
                        Outdent,
                        "",
                        NaN,
                        NaN,
                        NaN,
                        NaN,
                        NaN,
                        NaN
                    )
                )
            }

            // even though we are adding fewer outdents directly we still need to update the indent stack fully.
            if (iStart === 1) {
                indentStack.pop()
            }
            return match
        } else {
            // same indent, this should be lexed as simple whitespace and ignored
            return null
        }
    } else {
        // indentation cannot be matched under other circumstances
        return null
    }
}

// customize matchIndentBase to create separate functions of Indent and Outdent.
const matchIndent = _.partialRight(matchIndentBase, "indent")
const matchOutdent = _.partialRight(matchIndentBase, "outdent")

const If = createToken({ name: "If", pattern: /if/ })
const Else = createToken({ name: "Else", pattern: /else/ })
const Print = createToken({ name: "Print", pattern: /print/ })
//const IntegerLiteral = createToken({ name: "IntegerLiteral", pattern: /\d+/ })
const Colon = createToken({ name: "Colon", pattern: /:/ })
const LParen = createToken({ name: "LParen", pattern: /\(/ })
const RParen = createToken({ name: "RParen", pattern: /\)/ })
const Spaces = createToken({
    name: "Spaces",
    pattern: / +/,
    group: Lexer.SKIPPED
})

// newlines are not skipped, by setting their group to "nl" they are saved in the lexer result
// and thus we can check before creating an indentation token that the last token matched was a newline.
const Newline = createToken({
    name: "Newline",
    pattern: /\n|\r\n?/,
    group: "nl"
})

// define the indentation tokens using custom token patterns
const Indent = createToken({
    name: "Indent",
    pattern: matchIndent,
    // custom token patterns should explicitly specify the line_breaks option
    line_breaks: false
})
const Outdent = createToken({
    name: "Outdent",
    pattern: matchOutdent,
    // custom token patterns should explicitly specify the line_breaks option
    line_breaks: false
})

/*
    I copied the above from chevrotain python example
    I'll write Clio specific code below
*/

const String = createToken({name: "String", pattern: /'([^\\]|\\.)*?'|"([^\\]|\\.)*?"/})
const Word = createToken({ name: "Word", pattern: /#[^\[\] \r\n:]+/i})
const Number = createToken({ name: "Number", pattern: /(0|-?[1-9][0-9']*)(n|(\.[0-9']+))?/})
const Fn = createToken({ name: "Fn", pattern: /fn/})
const Async = createToken({ name: "Async", pattern: /async/})
const Elif = createToken({ name: "Elif", pattern: /elif/})
const Bool = createToken({ name: "Bool", pattern: /true|false/})
const Transform = createToken({ name: "Transform", pattern: /transform/})
const And = createToken({ name: "And", pattern: /and/})
const Or = createToken({ name: "Or", pattern: /or/})
const Not = createToken({ name: "Not", pattern: /not/})
const Of = createToken({ name: "Of", pattern: /of/})
const As = createToken({ name: "As", pattern: /as/})
const Import = createToken({ name: "Import", pattern: /import/})
const From = createToken({ name: "From", pattern: /from/})
const URL = createToken({ name: "URL", pattern: /(http|ws)s?:\/\/[^ \r\n]+/})
const Path = createToken({ name: "Path", pattern: /(((((\.\.|[-_.a-zA-Z0-9]+)\/)+|\.\/)[-_.a-zA-Z0-9]+(\.(js|clio))?)|([-_.a-zA-Z0-9]\.(js|clio)))/})
const Comment = createToken({ name: "Comment", pattern: /--[^\r\n]+/, group: Lexer.SKIPPED})
const Symbol = createToken({ name: "Symbol", pattern: /[a-z$_][a-z_0-9$-]*/i })
const Pipe = createToken({ name: "Pipe", pattern: /->/ })
const EPipe = createToken({ name: "EPipe", pattern: /=>/ })
const Comparison = createToken({ name: "Comparison", pattern: /(!=|>=|<=|>|<|=)/ })
const BasicMath = createToken({ name: "BasicMath", pattern: /[-+]/ })
const Power = createToken({ name: "Power", pattern: /\*\*/ })
const Multiply = createToken({ name: "Multiply", pattern: /\*/ })
const Divide = createToken({ name: "Divide", pattern: /\// })
const Modulo = createToken({ name: "Modulo", pattern: /%/ })
const Dot = createToken({ name: "Dot", pattern: /\./ })
const At = createToken({ name: "At", pattern: /@(\d+)?/ })
const LBracket = createToken({ name: "LBracket", pattern: /\[/ })
const RBracket = createToken({ name: "RBracket", pattern: /\]/ })
const LCurlyBracket = createToken({ name: "LCurlyBracket", pattern: /{/ })
const RCurlyBracket = createToken({ name: "RCurlyBracket", pattern: /}/ })

const allTokens = [

    Comment,

    Newline,
    // indentation tokens must appear before Spaces, otherwise all indentation will always be consumed as spaces.
    // Outdent must appear before Indent for handling zero spaces outdents.
    Outdent,
    Indent,

    Spaces,

    If,
    Else,
    Elif,

    Fn,
    Async,
    Bool,
    Transform,
    And,
    Or,
    Not,
    Of,
    As,
    Import,
    From,
    URL,
    Path,

    String,
    Word,
    Symbol,

    Number,
    Colon,
    Pipe,
    EPipe,
    Comparison,
    BasicMath,
    Power,
    Multiply,
    Divide,
    Modulo,
    Dot,
    At,

    LParen,
    RParen,
    LBracket,
    RBracket,
    LCurlyBracket,
    RCurlyBracket,
]

const tokenMap = {
    Comment,

    Newline,
    // indentation tokens must appear before Spaces, otherwise all indentation will always be consumed as spaces.
    // Outdent must appear before Indent for handling zero spaces outdents.
    Outdent,
    Indent,

    Spaces,

    If,
    Else,
    Elif,

    Fn,
    Async,
    Bool,
    Transform,
    And,
    Or,
    Not,
    Of,
    As,
    Import,
    From,
    URL,
    Path,

    String,
    Word,
    Symbol,

    Number,
    Colon,
    Pipe,
    EPipe,
    Comparison,
    BasicMath,
    Power,
    Multiply,
    Divide,
    Modulo,
    Dot,
    At,

    LParen,
    RParen,
    LBracket,
    RBracket,
    LCurlyBracket,
    RCurlyBracket,
}

const clioLexer = new Lexer(allTokens);

module.exports = {
    // for testing purposes
    allTokens: allTokens,
    tokenMap: tokenMap,

    tokenize: function (text) {
        // have to reset the indent stack between processing of different text inputs
        indentStack = [0]

        const lexResult = clioLexer.tokenize(text)

        //add remaining Outdents
        while (indentStack.length > 1) {
            lexResult.tokens.push(
                createTokenInstance(Outdent, "", NaN, NaN, NaN, NaN, NaN, NaN)
            )
            indentStack.pop()
        }

        if (lexResult.errors.length > 0) {
            throw new Error("sad sad panda lexing errors detected")
        }
        return lexResult
    }
}
