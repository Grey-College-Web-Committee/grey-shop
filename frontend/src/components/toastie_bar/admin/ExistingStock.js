import React from 'react';
import PropTypes from 'prop-types';
import StockRow from './StockRow';

class ExistingStock extends React.Component {
  render () {
    // Should only be displayed once we have data anyway based
    // on the render function in ToastieBarStockPage.js
    if(this.props.stock === undefined) {
      return (
        <p>Loading...</p>
      );
    }

    // Just displays a table with the existing stock
    return (
      <React.Fragment>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Price (£)</th>
              <th>Available</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.props.stock.map((item, index) => (
              <React.Fragment key={index}>
                <StockRow
                  item={item}
                />
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </React.Fragment>
    )
  }
}

ExistingStock.propTypes = {
  stock: PropTypes.array.isRequired
};

export default ExistingStock;
