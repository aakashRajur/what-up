import PropTypes from 'prop-types';
import React, {Component} from 'react';
import './filter-button.css'

class FilterButton extends Component {
	static propTypes = {
		filter: PropTypes.string,
		onClick: PropTypes.func,
		className: PropTypes.string,
		title: PropTypes.string,
		active: PropTypes.bool,
		stat: PropTypes.number,
	};
	
	static defaultProps = {
		active: false,
		filter: '',
		stat: 0,
		title: ''
	};
	
	constructor(props) {
		super(props);
		this.onClick = this.onClick.bind(this);
	}
	
	render() {
		let {
			title, active,
			filter, stat
		} = this.props;
		return (
			<button title={title} className={`filter ${filter.toLowerCase()}`}
			        onClick={this.onClick} data-active={active} disabled={active}>
				{title}
				<span className="badge">{stat > 99 ? '∞' : stat}</span>
			</button>
		)
	}
	
	onClick() {
		let {onClick, filter} = this.props;
		onClick && onClick(filter);
	}
}

export default FilterButton;
