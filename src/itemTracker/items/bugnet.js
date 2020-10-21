import React from 'react';
import noBugnet from '../../assets/Bugnet_Silhouette.png'
import bugnet from '../../assets/Bugnet_Icon.png'

export default class Bugnet extends React.Component {
    constructor (props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    render() {
        const current = this.props.current
        switch (current) {
            case 0:
                return <div id={"Bugnet-item"}>
                    <img src={noBugnet} onClick={this.handleClick} alt={"No Bugnet"}/>
                </div>
            case 1:
                return <div id={"Bugnet-item"}>
                    <img src={bugnet} onClick={this.handleClick} alt={"Bugnet"}/>
                </div>
            default:
                return null

        }
    }

    handleClick () {
        this.props.onChange("bugnet")
    }
}
