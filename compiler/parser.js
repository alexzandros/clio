const lexer = require("./lexer");
const { Parser } = require("chevrotain")

const tokens = lexer.tokenMap;

class ClioParser extends Parser {
    constructor() {
        super(tokens)

        const $ = this

        $.RULE("clio", () => {
            $.MANY(() => {
                $.OR([
                    { ALT: () => { $.SUBRULE($.statement) } },
                ])
            })
        })

        $.RULE("primitive", () => {
            $.OR([
                { ALT: () => { $.CONSUME(tokens.Number) } },
                { ALT: () => { $.CONSUME(tokens.Word) } },
                { ALT: () => { $.CONSUME(tokens.String) } },
                { ALT: () => { $.CONSUME(tokens.Bool) } },
                { ALT: () => { $.CONSUME(tokens.Symbol) } },
            ])
        })

        $.RULE("value", () => {
            $.OR([
                { ALT: () => { $.SUBRULE($.primitive) } },
                { ALT: () => { $.SUBRULE($.wrappedStatement) } },
                { ALT: () => { $.SUBRULE($.list) } },
            ])
        })

        $.RULE("list", () => {
            $.CONSUME(tokens.LBracket)
            $.MANY(() => {
                $.SUBRULE($.value)
            })
            $.CONSUME(tokens.RBracket)
        })

        $.RULE("wrappedStatement", () => {
            $.CONSUME(tokens.LParen)
            $.SUBRULE($.statement)
            $.CONSUME(tokens.RParen)
        })

        $.RULE("statement", () => {
            $.OR([
                { ALT: () => { $.SUBRULE($.flow) } },
                { ALT: () => { $.SUBRULE($.conditional) } },
            ])
        })

        $.RULE("arithmatic", () => {
            $.SUBRULE($.higherMath, { LABEL: "lhs" })
            $.MANY(() => {
                $.CONSUME(tokens.BasicMath)
                $.SUBRULE1($.higherMath, { LABEL: "rhs" })
            })
        })

        $.RULE("higherMath", () => {
            $.SUBRULE($.power, { LABEL: "lhs" })
            $.MANY(() => {
                $.OR([
                    { ALT: () => { $.CONSUME(tokens.Multiply) } },
                    { ALT: () => { $.CONSUME(tokens.Modulo) } },
                    { ALT: () => { $.CONSUME(tokens.Divide) } },
                ])
                $.SUBRULE1($.power, { LABEL: "rhs" })
            })
        })

        $.RULE("power", () => {
            $.SUBRULE($.value, { LABEL: "lhs" })
            $.MANY(() => {
                $.CONSUME(tokens.Power)
                $.SUBRULE1($.value, { LABEL: "rhs" })
            })
        })

        $.RULE("flow", () => {
            $.SUBRULE($.arithmatic)
            $.MANY(() => {
                $.OPTION(() => {
                    $.CONSUME(tokens.Indent)
                })
                $.OR([
                    { ALT: () => { $.SUBRULE($.functionCall) } },
                    { ALT: () => { $.SUBRULE($.functionMap) } },
                    { ALT: () => { $.SUBRULE($.setValue) } },
                ])
                $.OPTION1(() => {
                    $.CONSUME1(tokens.Outdent)
                })
            })
        })

        $.RULE("functionCall", () => {
            $.CONSUME(tokens.Pipe)
            $.OR([
                { ALT: () => $.SUBRULE($.quickFunction) },
                { ALT: () => {
                    $.CONSUME(tokens.Symbol)
                    $.MANY(() => {
                        $.OR1([
                            { ALT: () => { $.SUBRULE($.arithmatic) } },
                            { ALT: () => { $.SUBRULE($.wrappedQuickFunction) } },
                            { ALT: () => { $.SUBRULE($.transform) } },
                            { ALT: () => { $.CONSUME(tokens.At) } },
                        ])
                    })
                }},
                { ALT: () => $.SUBRULE($.functionDefinition)},
            ])
        })

        $.RULE("functionMap", () => {
            $.CONSUME(tokens.Pipe)
            $.CONSUME(tokens.Multiply)
            $.OR([
                { ALT: () => $.SUBRULE($.quickFunction) },
                {
                    ALT: () => {
                        $.CONSUME(tokens.Symbol)
                        $.MANY(() => {
                            $.OR1([
                                { ALT: () => { $.SUBRULE($.arithmatic) } },
                                { ALT: () => { $.SUBRULE($.wrappedQuickFunction) } },
                                { ALT: () => { $.SUBRULE($.transform) } },
                                { ALT: () => { $.CONSUME(tokens.At) } },
                            ])
                        })
                    }
                },
                { ALT: () => $.SUBRULE($.functionDefinition) },
            ])
        })

        $.RULE("setValue", () => {
            $.CONSUME(tokens.EPipe)
            $.CONSUME(tokens.Symbol)
        })

        $.RULE("block", () => {
            $.CONSUME(tokens.Indent)
            $.MANY(() => {
                $.SUBRULE($.statement)
            })
            $.CONSUME(tokens.Outdent)
        })

        $.RULE("conditional", () => {
            $.SUBRULE($.ifStatement)
            $.MANY(() => {
                $.SUBRULE($.elifStatement)
            })
            $.OPTION(() => {
                $.SUBRULE($.elseStatement)
            })
        })

        $.RULE("ifStatement", () => {
            $.CONSUME(tokens.If)
            $.SUBRULE($.statement)
            $.CONSUME(tokens.Colon)
            $.SUBRULE($.block)
        })

        $.RULE("elifStatement", () => {
            $.CONSUME(tokens.Elif)
            $.SUBRULE($.statement)
            $.CONSUME(tokens.Colon)
            $.SUBRULE($.block)
        })

        $.RULE("elseStatement", () => {
            $.CONSUME(tokens.Elif)
            $.SUBRULE($.statement)
            $.CONSUME(tokens.Colon)
            $.SUBRULE($.block)
        })

        $.RULE("functionDefinition", () => {
            $.CONSUME(tokens.Fn)
            $.CONSUME(tokens.Symbol)
            $.AT_LEAST_ONE(() => {
                $.CONSUME1(tokens.Symbol)
            })
            $.CONSUME(tokens.Colon)
            $.SUBRULE($.block)
        })

        $.RULE("quickFunction", () => {
            $.CONSUME(tokens.Symbol)
            $.CONSUME(tokens.Colon)
            $.SUBRULE($.statement)
        })

        $.RULE("wrappedQuickFunction", () => {
            $.CONSUME(tokens.LParen)
            $.SUBRULE($.quickFunction)
            $.CONSUME(tokens.RParen)
        })

        $.RULE("transform", () => {
            $.CONSUME(tokens.LParen)
            $.CONSUME(tokens.At)
            $.CONSUME(tokens.EPipe)
            $.SUBRULE($.quickFunction)
            $.CONSUME(tokens.RParen)
        })

        $.RULE("fullCompare", () => {
            $.SUBRULE($.statement)
            $.SUBRULE($.halfCompare)
        })

        $.RULE("halfCompare", () => {
            $.CONSUME(tokens.Comparison)
            $.SUBRULE($.statement)
        })

        this.performSelfAnalysis()
    }
}

// ONLY ONCE
const parser = new ClioParser([])

function generateDiagram() {
    const path = require("path")
    const fs = require("fs")
    const chevrotain = require("chevrotain")

    // extract the serialized grammar.
    const serializedGrammar = parser.getSerializedGastProductions()

    // create the HTML Text
    const htmlText = chevrotain.createSyntaxDiagramsCode(serializedGrammar)

    // Write the HTML file to disk
    const outPath = path.resolve(__dirname, "./")
    fs.writeFileSync(outPath + "/generated_diagrams.html", htmlText)

}

generateDiagram()

const fs = require("fs")

function parseInput(text) {
    const lexingResult = lexer.tokenize(text)
    // "input" is a setter which will reset the parser's state.
    // "input" is a setter which will reset the parser's state.
    parser.input = lexingResult.tokens    
    const cst = parser.clio()

    if (parser.errors.length > 0) {
        console.log(parser.errors);
        
        throw new Error("sad sad panda, Parsing errors detected")
    }

    fs.writeFileSync("compiler/cst.json", JSON.stringify(cst, null, 2));
}

const inputText = `
[1 2 3] -> * mul 3
        -> print => list
        -> fn name n:
             n ** 4
`
parseInput(inputText)
