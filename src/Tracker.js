import React from 'react';
import LocationTracker from './locationTracker/LocationTracker';
import ItemTracker from './itemTracker/itemTracker'
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/cjs/Row";

const request = require('request');
const yaml = require('js-yaml');

//state structure
//locationGroups: array of strings containing the full list of location group names
//locations: array containing the full list of individual locations and their data with the following heirarchy
//  groups
//      locations
//          checked
//example:
//  Skyloft
//      Fledge
//          true
//      Practice Sword
//          false
//  Lanayru
//      Chest Near Party Wheel
//          false
class Tracker extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            locationGroups: [],
            locations: [],
            items: ["Practice Sword", "Goddess Sword", "Emerald Tablet", "Ruby Tablet", "Amber Tablet"],
        };
         //bind this to handlers to ensure that context is correct when they are called so they have access to this.state and this.props
        this.handleGroupClick = this.handleGroupClick.bind(this);
        this.handleLocationClick = this.handleLocationClick.bind(this);
        this.parseLogicExpression = this.parseLogicExpression.bind(this);
        this.parseFullLogicExpression = this.parseFullLogicExpression.bind(this);
        this.parseLogicExpressionToString = this.parseLogicExpressionToString.bind(this);
        this.isLogicSymbol = this.isLogicSymbol.bind(this);
        this.isMacro = this.isMacro.bind(this);
        this.parseMacro = this.parseMacro.bind(this);
        this.checkAllRequirements = this.checkAllRequirements.bind(this);
        this.meetsRequirements = this.meetsRequirements.bind(this);
        this.meetsRequirement = this.meetsRequirement.bind(this);
        this.meetsCompoundRequirement = this.meetsCompoundRequirement.bind(this);
        this.updateLocationLogic = this.updateLocationLogic.bind(this);
    }

    componentDidMount() {  
        //request and parse the locations and macros yaml file from the randomizer repositroy
        //This ensures that we always have up to date locations and logic
        request.get('https://raw.githubusercontent.com/lepelog/sslib/master/SS%20Rando%20Logic%20-%20Macros.yaml', (error, response, body) => {
            if (error || response.statusCode !== 200) return;
            const macros = yaml.safeLoad(body);
            let parsedMacros = [];
            for (let macro in macros) {
                parsedMacros[macro] = this.parseLogicExpression(macros[macro])
            }
            this.setState({macros: parsedMacros})
            request.get('https://raw.githubusercontent.com/lepelog/sslib/master/SS%20Rando%20Logic%20-%20Item%20Location.yaml', (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    const doc = yaml.safeLoad(body);
                    const locations = [];
                    for (var location in doc) {
                        const splitName = location.split('-', 2);
                        let group = splitName[0].trim(); //group is the area the location belongs to (e.g. Skyloft, Faron, etc.)
                        //fix groups that have specific naming for randomizer reasons
                        if (group === 'Skyview Boss Room' || group === 'Skyview Spring') {
                            group = 'Skyview'
                        } else if (group === 'ET Boss Room' || group === 'ET Spring') {
                            group = 'Earth Temple';
                        } else if (group === 'LMF boss room') {
                            group = 'Lanayru Mining Facility';
                        } else if (group === 'AC Boss Room') {
                            group = 'Ancient Cistern';
                        } else if (group === 'Skyloft Silent Realm') {
                            group = 'Skyloft';
                        } else if (group === 'Faron Silent Realm') {
                            group = 'Faron Woods';
                        } else if (group === 'Eldin Silent Realm') {
                            group = 'Eldin Volcano';
                        } else if (group === 'Lanyru Silent Realm') {
                            group = 'Lanayru';
                        } else if (group === 'Skykeep') {
                            group = 'Sky Keep';
                        }
                        const locationName = splitName[1].trim();
                        if (locations[group] == null) {
                            locations[group] = [];
                        }

                        let logicExpression = this.parseLogicExpression(doc[location].Need);
                        let finalRequirements = this.parseLogicExpressionToString(this.parseFullLogicExpression(logicExpression), 0)
                        let newLocation = {
                            localId: -1,
                            name: locationName.trim(),  
                            checked: false,
                            logicExpression: logicExpression,
                            needs: finalRequirements,
                            inLogic: this.meetsRequirements(logicExpression)
                        }
                        let id = locations[group].push(newLocation) - 1;
                        locations[group][id].localId = id;
                    }
                    this.setState({locations: locations})
                    const locationGroups = [];
                    for (var group in locations) {
                        locationGroups.push(group);
                    }
                    this.setState({locationGroups: locationGroups})
                }
            });
        });
    }

    parseLogicExpression(expression) {
        let tokens = expression.split(/([&|()])/);
        //trim all the results
        tokens.forEach((token, index) => {
            tokens[index] = token.trim();
        });
        tokens = tokens.filter(token => token.length > 0);

        let stack = [];
        tokens.forEach(token => {
            if (token === "(") {
                stack.push("(");
            } else if (token === ")") {
                let nestedTokens = [];
                let nestedParenthesesLevel = 0;
                while (stack.length !== 0) {
                    let exp = stack.pop();
                    if (exp === "(") {
                        if (nestedParenthesesLevel === 0) {
                            break;
                        } else {
                            nestedParenthesesLevel--;
                        }
                    }
                    if (exp === ")") {
                        nestedParenthesesLevel++;
                    }
                    nestedTokens.push(exp);
                }
                nestedTokens.reverse();
                stack.push("(");
                stack.push(nestedTokens);
                stack.push(")");
            } else { //found an actual expression
                stack.push(token);
            }
        });
        return stack;
    }

    parseFullLogicExpression(expression) {
        let tokens = expression.slice()
        tokens = tokens.filter(token => token.length > 0);

        let stack = [];
        tokens.forEach(token => {
            if (token === "(") {
                stack.push("(");
            } else if (token === ")") {
                let nestedTokens = [];
                let nestedParenthesesLevel = 0;
                while (stack.length !== 0) {
                    let exp = stack.pop();
                    if (exp === "(") {
                        if (nestedParenthesesLevel === 0) {
                            break;
                        } else {
                            nestedParenthesesLevel--;
                        }
                    }
                    if (exp === ")") {
                        nestedParenthesesLevel++;
                    }
                    if (this.isMacro(exp)) {
                        nestedTokens = nestedTokens.concat(this.parseFullLogicExpression(this.parseMacro(exp)));
                    } else {
                        if (typeof(exp) === "string") {
                            nestedTokens.push(exp)
                        } else {
                            nestedTokens = nestedTokens.concat(this.parseFullLogicExpression(exp));
                        }
                    }
                }
                nestedTokens.reverse();
                stack.push("(");
                stack = stack.concat(nestedTokens);
                stack.push(")");
            } else { //found an actual expression
                if (this.isMacro(token)) {
                    stack = stack.concat(this.parseFullLogicExpression(this.parseMacro(token)));
                } else {
                    if (typeof(token) === "string") {
                        stack.push(token)
                    } else {
                        stack = stack.concat(this.parseFullLogicExpression(token));
                    }
                }
            }
        });
        return stack;
    }

    parseLogicExpressionToString(logicExpression, nestedLevel) {
        let requirements = logicExpression.slice();
        let finalRequirements = [];
        let nestedParenthesesLevel = nestedLevel;
        let current = "";
        requirements.forEach(req => {
            if (typeof(req) === "string") {
                if (req === "(") {
                    if (nestedParenthesesLevel !== 0) {
                        current += "(";
                    }
                    nestedParenthesesLevel--;
                } else if (req === ")") {
                    nestedParenthesesLevel++;
                    if (nestedParenthesesLevel === 0) {
                        finalRequirements.push(current);
                        current = "";
                    } else {
                        current += ")"
                    }
                } else if (req === "&") {
                    if (nestedParenthesesLevel !== 0) {
                        current += " and "
                    } else {
                        finalRequirements.push(current);
                        current = "";
                    }
                } else if (req === "|") {
                    current += " or "
                } else {
                    current += req;
                }
            } else {
                finalRequirements = finalRequirements.concat(this.parseLogicExpressionToString(req, nestedParenthesesLevel));
            }
        });
        if (current !== "") {
            finalRequirements.push(current);
        }
        return finalRequirements;
    }

    isLogicSymbol(token) {
        return token !== "&" && token !== "|" && token !== "(" && token !== ")"
    }

    isMacro(macro) {
        return this.state.macros[macro];
    }

    parseMacro(macro) {
        return this.state.macros[macro];
    }

    checkAllRequirements() {
        for (let group in this.state.locations) {
            this.state.locations[group].forEach(location => {
                location.inLogic = this.meetsCompoundRequirement(location.logicExpression);
            });
        }
    }

    //checks if an entire list of requirements are met for a check
    meetsRequirements(requirements) {
        let met = true;
        requirements.forEach(requirement => {
            if (!this.meetsRequirement(requirement)) {
                met = false;
            }
        });
        return met;
    }

    //checks an individual requirement for a check
    meetsRequirement(requirement) {
        if (requirement === "Nothing") {
            return true;
        }
        if (requirement === "(" || requirement === ")" || requirement === "&" || requirement === "|") {
            return true;
        }
        let macro = this.state.macros[requirement];
        if (this.state.items.includes(requirement)) {
            return true;
        } else if (macro !== undefined) {
            return this.meetsCompoundRequirement(macro);
        } else {
            return false;
        }
    }

    meetsCompoundRequirement(requirement) {
        let tokens = requirement;
        tokens = tokens.filter(token => token !== "" || token !== " ");
        tokens.reverse();
        let expressionType = "";
        let subexpressionResults = [];
        while(tokens.length > 0) {
            let token = tokens.pop();
            if (token === "|") {
                expressionType = "OR"
            } else if (tokens === "&") {
                expressionType = "AND"
            } else if (token === "(") {
                let nestedExpression = tokens.pop();
                if (nestedExpression === "(") { //nested parenthesis
                    nestedExpression = ["("] + tokens.pop();
                }
                subexpressionResults.push(this.meetsCompoundRequirement(nestedExpression));
                if (tokens.pop() !== ")") {
                    console.log("ERROR: MISSING CLOSING PARENTHESIS")
                }
            } else {
                subexpressionResults.push(this.meetsRequirement(token))
            }
        }

        if (expressionType === "OR") {
            return subexpressionResults.some(result => result)
        } else {
            return subexpressionResults.every(result => result)
        }
    }

    handleGroupClick(group) {
        if (this.state.expandedGroup === group) {
            this.setState({expandedGroup: ''}); //deselection if the opened group is clicked again
        } else {
            this.setState({expandedGroup: group});
        }
    }

    handleLocationClick(group, location) {
        const newState = Object.assign({}, this.state.locations); //copy current state
        newState[group][location].checked = !newState[group][location].checked;
        this.setState({locations: newState});
    }

    updateLocationLogic(item, value) {
        let newState = this.state.items.slice();
        switch (item) {
            case "beetle":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Beetle"), 1);
                        newState.splice(newState.indexOf("Hook Beetle"), 1);
                        break;
                    case 1:
                        newState.push("Beetle");
                        break;
                    case 2:
                        newState.push("Hook Beetle");
                        break;
                    default:
                        break;
                }
                break;
            case "slingshot":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Slingshot"), 1);
                        break;
                    case 1:
                        newState.push("Slingshot");
                        break;
                    default:
                        break;
                }
                break;
            case "bombs":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Bomb Bag"), 1);
                        break;
                    case 1:
                        newState.push("Bomb Bag");
                        break;
                    default:
                        break;
                }
                break;
            case "gustBellows":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Gust Bellows"), 1);
                        break;
                    case 1:
                        newState.push("Gust Bellows");
                        break;
                    default:
                        break;
                }
                break;
            case "whip":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Whip"), 1);
                        break;
                    case 1:
                        newState.push("Whip");
                        break;
                    default:
                        break;
                }
                break;
            case "clawshots":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Clawshots"), 1);
                        break;
                    case 1:
                        newState.push("Clawshots");
                        break;
                    default:
                        break;
                }
                break;
            case "bow":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Bow"), 1);
                        break;
                    case 1:
                        newState.push("Bow");
                        break;
                    default:
                        break;
                }
                break;
            case "bugnet":
                switch (value) {
                    case 0:
                        newState.splice(newState.indexOf("Bug Net"), 1);
                        break;
                    case 1:
                        newState.push("Bug Net");
                        break;
                    default:
                        break;
                }
                break;    
            default:
                break;
        }
        this.setState({items: newState});
    }

    render() {
        this.checkAllRequirements();
        return (
            <div>
                <Container>
                    <Row xs={1} sm={2} md={3}>
                        <Col xs={1}>
                            <ItemTracker updateLogic={this.updateLocationLogic} />
                        </Col>
                        <Col xs={1}>
                            <LocationTracker
                                locationGroups={this.state.locationGroups}
                                locations={this.state.locations}
                                expandedGroup={this.state.expandedGroup}
                                handleGroupClick={this.handleGroupClick}
                                handleLocationClick={this.handleLocationClick}
                                meetsRequirement={this.meetsRequirement}
                            />
                        </Col>
                    </Row>
                </Container>
            </div>
        )
    }
}

export default Tracker;