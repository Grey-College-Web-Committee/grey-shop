import React from 'react';
import api from '../../utils/axiosConfig.js';
import SelectBread from './SelectBread';
import SelectMany from './SelectMany';
import CheckoutForm from '../payment/CheckoutForm';
import authContext from '../../utils/authContext.js';
import config from '../../config.json';
import LoadingHolder from '../common/LoadingHolder';
import ViewCart from '../cart/ViewCart.js';
import AddToCartButton from '../cart/AddToCartButton.js';

class OrderToastiePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      status: 0,
      error: "",
      stock: [],
      choices: [],
      crisps: [],
      chocolates: [],
      drinks: [],
      bread: -1,
      cost: 0,
      purchaseDisabled: false,
      confirmed: false,
      confirmedOrder: {},
      realCost: 0,
      clientSecret: "",
      paymentSuccessful: false,
      currentDate: new Date(),
      discountApplied: false,
      termLocked: true
    };
  }

  componentDidMount = async () => {
    // Once the component is ready we can query the API
    const loaded = await this.updateStockListing();
    this.setState({ loaded });
  }

  updateStockListing = async () => {
    this.setState({ error: "" });
    let query;

    // Standard way to just get the data from the API
    try {
      query = await api.get("/toastie_bar/stock");
    } catch (error) {
      this.setState({ status: error.response.status, error: error.response.data.error });
      return false;
    }

    const stock = query.data.stock;

    this.setState({ status: query.status, stock });
    return true;
  }

  // These 3 are used by the child components to share their choices with the parent
  passUpFillings = (choices) => {
    this.setState({ choices }, this.calculateCost);
  }

  passUpBread = (bread) => {
    this.setState({ bread: Number(bread) }, this.calculateCost);
  }

  passUpItems = (name, items) => {
    this.setState({ [name]: items }, this.calculateCost);
  }

  // Just runs through and calculates the cost
  // converts strings to ints so we can get a sensible value
  calculateCost = () => {
    let cost = 0;
    let toastieOrdered = this.state.bread !== -1;
    let chocOrDrinkOrdered = false;

    if(toastieOrdered) {
      cost += Number(this.state.stock.find(item => item.id === this.state.bread).price);
    }

    const selectedFillings = this.state.stock.filter(item => this.state.choices.includes(item.id));

    selectedFillings.forEach(item => {
      cost += Number(item.price);
    });

    const selectedChocolates = this.state.stock.filter(item => this.state.chocolates.includes(item.id));

    selectedChocolates.forEach(item => {
      cost += Number(item.price);
      chocOrDrinkOrdered = true;
    });

    const selectedCrisps = this.state.stock.filter(item => this.state.crisps.includes(item.id));

    selectedCrisps.forEach(item => {
      cost += Number(item.price);
    });

    const selectedDrinks = this.state.stock.filter(item => this.state.drinks.includes(item.id));

    selectedDrinks.forEach(item => {
      cost += Number(item.price);
      chocOrDrinkOrdered = true;
    });

    // Apply a slight discount if they purchase a toastie and (choc or drink)
    if(chocOrDrinkOrdered && toastieOrdered) {
      cost -= 0.2;
    }

    cost = Math.round(cost * 100) / 100;

    this.setState({ cost, discountApplied: toastieOrdered && chocOrDrinkOrdered });
  }

  placeOrder = async () => {
    // Don't want them resubmitting while we are handling one already
    this.setState({ purchaseDisabled: true, error: "" });
    const otherItems = this.state.chocolates.concat(this.state.drinks).concat(this.state.crisps);

    // Ordering a toastie
    if(this.state.bread !== -1) {
      // No fillings isn't allowed
      if(this.state.choices.length === 0) {
        this.setState({ purchaseDisabled: false, error: "You must select some fillings for your toastie." });
        return;
      }
    } else {
      // They didn't order anything
      if(otherItems.length === 0) {
        this.setState({ purchaseDisabled: false, error: "You must order something." });
        return;
      }

      // Only fillings and other items isn't allowed either
      if(this.state.choices.length !== 0) {
        this.setState({ purchaseDisabled: false, error: "You cannot just order fillings. Please select a bread type." });
        return;
      }
    }

    const orderDetails = {
      bread: this.state.bread,
      fillings: this.state.choices,
      otherItems
    };

    let query;

    // Get the server to check everything and give us the details for the Stripe checkout
    try {
      query = await api.post("/toastie_bar/order", orderDetails);
    } catch (error) {
      const timeIssue = error.response.data.timeIssue;

      if(timeIssue) {
        // We don't undisable here as they need to refresh instead
        this.setState({ error: "Unfortunately your order was not submitted in time. The Toastie Bar is now closed." });
        return;
      }

      // We don't undisable here as they need to refresh instead
      this.setState({ error: "An item you ordered has now gone of stock. Please refresh the page to see a list of available items." });
      return;
    }

    // We can now show the payment area
    this.setState({
      confirmed: true,
      confirmedOrder: query.data.confirmedOrder,
      realCost: query.data.realCost,
      clientSecret: query.data.clientSecret
    });
  }

  // Used by the CheckoutForm to make changes to the page's state
  onPaymentSuccess = () => {
    this.setState({ paymentSuccessful: true });
  }

  displayToastieOrder = () => {
    const items = this.state.confirmedOrder.filter(item => item.type === "filling" || item.type === "bread");

    if(items.length === 0) {
      return (
        <p><strong>None selected</strong></p>
      );
    }

    return (
      <table>
        <thead>
          <tr>
            <th>Item</th><th>Price (£)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  displayOtherItemsOrder = (type) => {
    const otherItems = this.state.confirmedOrder.filter(item => item.type === type);

    if(otherItems.length === 0) {
      return (
        <p><strong>None selected</strong></p>
      );
    }

    return (
      <table>
        <thead>
          <tr>
            <th>Item</th><th>Price (£)</th>
          </tr>
        </thead>
        <tbody>
          {otherItems.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  render () {
    return (
      <React.Fragment>
        <ViewCart />
      </React.Fragment>
    );

    return (
      <AddToCartButton
        shop="toastie"
        name="Test Object"
        basePrice={0.7}
        quantity={1}
        submissionInformation={{
          test: "abc",
          field: true
        }}
        components={[
          {
            "name": "Ab",
            "part": true
          }
        ]}
        callback={(success) => {
          console.log("Added Item", success);
        }}
      />
    )

    // The Toastie Bar is only open between 8pm and 9:30pm for orders
    const hours = this.state.currentDate.getHours();
    const minutes = this.state.currentDate.getMinutes();

    if(!config.debug && this.state.termLocked) {
      return (
        <React.Fragment>
          <h1>Toastie Bar Closed</h1>
          <p>The Toastie Bar is currently closed until next term.</p>
        </React.Fragment>
      )
    }

    if(!config.debug) {
      // Outside 8:00pm to 9:30pm
      if((hours === 21 && minutes >= 30) || hours < 20 || hours >= 22) {
        return (
          <React.Fragment>
            <h1>Toastie Bar Closed</h1>
            <p>The Toastie Bar is currently not accepting anymore orders.</p>
            <p>It is open daily from 8pm to 10pm.</p>
            <p><strong>Orders cannot be placed after 9:30pm.</strong></p>
          </React.Fragment>
        )
      }
    }

    // Still waiting for data from the API
    if(!this.state.loaded) {
      return (
        <LoadingHolder />
      );
    }

    // Error occurred should probably handle this better when I get the chance
    if(this.state.status !== 200) {
      return (
        <React.Fragment>
          <h1>Something went wrong</h1>
          <p>An error occurred when trying to load this page. Please try again later.</p>
        </React.Fragment>
      );
    }

    // Once they have paid we can hide everything else
    if(this.state.paymentSuccessful) {
      return (
        <React.Fragment>
          <h1>Payment Success!</h1>
          <p>Your order is now being processed. Please come and collect it in 10-15 minutes!</p>
          <h2>Toastie</h2>
          {this.displayToastieOrder()}
          <br />
          <h2>Crisps</h2>
          {this.displayOtherItemsOrder("crisps")}
          <br />
          <h2>Chocolates</h2>
          {this.displayOtherItemsOrder("chocolates")}
          <br />
          <h2>Drinks</h2>
          {this.displayOtherItemsOrder("drinks")}
          <br />
          <p><strong>A receipt has been emailed to {this.context.email}</strong></p>
        </React.Fragment>
      )
    }

    // They are still constructing their order at this point
    if(!this.state.confirmed) {
      return (
        <React.Fragment>
          <h1>Order Toastie</h1>
          {hours >= 21 && minutes >= 15 ? <p><strong>Please note that last orders are at 9:30pm. Any order submitted after this time may not be processed.</strong></p> : null}
          <p>If you order a toastie and some chocolate and/or a drink you will receive a £0.20 discount!</p>
          <p>Select one type of bread. Unselectable items are out of stock.</p>
          <h2>Toastie</h2>
          <br/>
          <label><strong>Bread: </strong></label>
          <SelectBread
            stock={this.state.stock}
            passUp={this.passUpBread}
            disabled={this.state.purchaseDisabled}
          />
          <br/>
          <br/>
          <SelectMany
            stock={this.state.stock}
            passUp={this.passUpFillings}
            type="filling"
            disabled={this.state.purchaseDisabled}
          />
          <br/>
          <h2>Chocolate</h2>
          <SelectMany
            stock={this.state.stock}
            passUp={(items) => {this.passUpItems("chocolates", items)}}
            type="chocolates"
            disabled={this.state.purchaseDisabled}
          />
          <h2>Drinks</h2>
          <SelectMany
            stock={this.state.stock}
            passUp={(items) => {this.passUpItems("drinks", items)}}
            type="drinks"
            disabled={this.state.purchaseDisabled}
          />
          <h2>Crisps</h2>
          <SelectMany
            stock={this.state.stock}
            passUp={(items) => {this.passUpItems("crisps", items)}}
            type="crisps"
            disabled={this.state.purchaseDisabled}
          />
          <br/>
          <h2>Checkout</h2>
          {this.state.discountApplied ? <p>£0.20 discount applied</p> : null}
          <h3>Total £{this.state.cost.toFixed(2)}</h3>
          <br/>
          <button
            onClick={this.placeOrder}
            disabled={this.state.purchaseDisabled}
          >Place Order</button>
          <br/>
          <br/>
          {this.state.error.length !== 0 ? <h2>Error Occurred</h2> : null}
          {this.state.error.length !== 0 ? <p>{this.state.error}</p> : null}
        </React.Fragment>
      )
    } else {
      // They are ready to purchase the toastie
      return (
        <React.Fragment>
          <h1>Purchase Toastie</h1>
          <h2>Confirmed Order</h2>
          <h3>Toastie</h3>
          {this.displayToastieOrder()}
          <br />
          <h3>Crisps</h3>
          {this.displayOtherItemsOrder("crisps")}
          <br />
          <h3>Chocolates</h3>
          {this.displayOtherItemsOrder("chocolates")}
          <br />
          <h3>Drinks</h3>
          {this.displayOtherItemsOrder("drinks")}
          {this.state.discountApplied ? <p>£0.20 discount applied</p> : null}
          <div>
            <CheckoutForm
              clientSecret={this.state.clientSecret}
              onSuccess={this.onPaymentSuccess}
              realCost={Number(this.state.realCost) * 100}
            />
          </div>
        </React.Fragment>
      )
    }
  }
}

OrderToastiePage.contextType = authContext;

export default OrderToastiePage;
