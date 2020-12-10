import React from 'react';
import PropTypes from 'prop-types';
import api from '../../../utils/axiosConfig';
import ImageUploader from 'react-images-upload';

class AddStock extends React.Component {
  constructor(props) {
	super(props);
	this.state = {
	  name: "",
	  manufacturerCode: "",
	  description: "",
	  available: true,
	  type: "Hoodies and SweatShirts",
	  customisationsAvailable: [],
	  price: 0,
	  XS: true,
	  S: true,
	  M: true,
	  L: true,
	  XL: true,
	  XXL: true,
	  pictures: [],
	  progress: 0,
	  disabled: false,
	  uploadedLocation: "",
	  uploadDisabled: false
	}
	this.onDrop = this.onDrop.bind(this);
	this.onRemove = this.onRemove.bind(this);
	this.showCustomisations = this.showCustomisations.bind(this);
	this.onInputChange = this.onInputChange.bind(this);
  }

  onUpload = async (productId) => {
	this.setState({ disabled: true });
	const pictures = this.state.pictures;
	if(pictures.length === 0) {
	  alert("You haven't selected any pictures to upload.");
	  this.setState({ disabled: false });
	  return;
	}

	// Send to the server
	const file = pictures[0]
	const formData = new FormData();
	formData.append('file', file); // appending file
	let query;
	try {
	  query=await api.post(`/stash/upload/${productId}`, formData, {
		onUploadProgress: (ProgressEvent) => {
			let progress = Math.round(ProgressEvent.loaded / ProgressEvent.total * 100) + '%';
			this.setState({progress});
		}
	  });
	} catch (error) {
	  alert("An error occurred adding this colour option");
	  this.setState({ disabled: false });
	  return;
	}
	alert(query.data.message);
	this.setState({ pictures: [], disabled: false, uploadedLocation: query.data.name });
  }

  onDrop(pictureFiles, pictureDataURLs) {
	this.setState({
		pictures: pictureFiles
	});
  }

  onInputChange = e => {
	this.setState({ [e.target.name]: (e.target.type === "checkbox" ? e.target.checked : e.target.value) })
  }

  changeCustDesc(newDesc){
	this.setState({ cusotmisationDescription: newDesc })
  }

  saveImage = async(productId) =>{
	if(this.state.pictures.length === 0){
		return;
	}

  }

  saveSelectedColours = async(productId) =>{

	const coloursLength = this.props.colours.length;
	for (var i = 0; i < coloursLength; i++){
	  const colourId = this.props.colours[i].id;
	  
	  const isSelected = this.props.selectedColours[colourId];

	  if (isSelected){ // If colour is a selected colour
		// Add colour option to table on the server
		try {
		  await api.post("/stash/itemColour", { productId, colourId });
		} catch (error) {
		  alert("An error occurred adding this colour option");
		  return;
		};
	  }

	  else{
		// Remove the colour option from the table on the server
		try {
		  await api.delete(`/stash/itemColour/${productId}${colourId}`, { productId, colourId });
		} catch (error) {
		  alert("An error occurred adding this colour option");
		  return;
		};
	  }

	}
  }

  createNewItem = async e => {
	// Prevent refresh on button click and prevent resubmission
	e.preventDefault();
	this.setState({ disabled: true });

	const { name, manufacturerCode, description, available, type, customisationsAvailable, price, XS, S, M, L, XL, XXL, uploadedLocation } = this.state;

	// Validation checks - SORT THE REST OUT LATER
	if(name.length === 0) {
	  alert("You must set a name for the new item.");
	  this.setState({ disabled: false });
	  return;
	}

	if(type.length === 0) {
	  alert("You must set a type for the new item.");
	  this.setState({ disabled: false });
	  return;
	}

	// Add it to the database
	let query;
	try {
	  query = await api.post("/stash/stock", { name, manufacturerCode, description, available, type, customisationsAvailable: customisationsAvailable.length, price, XS, S, M, L, XL, XXL, uploadedLocation });
	} catch (error) {
	  this.setState({ status: error.response.status, error: error.response.data.error, loaded: true });
	  return;
	}
	const productId = query.data.productId;

	this.saveSelectedColours(parseInt(productId));
	if (this.state.pictures.length > 0){ this.onUpload(parseInt(productId)); }
	
	if (this.state.customisationsAvailable.length > 0){ this.postcustomisations(productId); }

	// Update the data displayed once we do this
	this.props.updateStockListing();
	this.setState({ name: "", type: "Hoodies and SweatShirts", manufacturerCode: "", description: "", price: 0, customisatiosnAvailable: false, cusotmisationDescription: "", addedPriceForCusotmisation: 0, available: true, disabled: false, XS: true, S: true, M: true, L: true, XL: true, XXL: true, pictures: [], progress: "0%", uploadedLocation: "" });
  }

  postcustomisations = async(productId) => {
	console.log("postCustomisation");
	let length = this.state.customisationsAvailable.length;
	for (var i = 0; i < length; i++){
	  const { description, addedPrice } = this.state.customisationsAvailable[i];
	  try {
		await api.post(`/stash/customisation/${productId}`, { customisationDescription:description, addedPriceForCustomisation:addedPrice });
	  } catch (error) {
		alert("Error adding customisation option")
		return;
	  }
	}
	this.setState({ customisationsAvailable: [] })
  }

  createColoursSelect(){
	let colours = [];
	let i = 0;
	while ( i < this.state.colours.length){
	  colours.push(<React.Fragment>
		<tr>
		  <td>{this.state.colours[i][0]}</td>
		  <td>
			<input
			  type="checkbox"
			  name={this.state.colours[i][0]}
			  onChange={this.onInputChange}
			  checked={this.state.available}
			/>
		  </td>
		</tr>
	  </React.Fragment>)
	  i++;
	}
	return(colours)
  }

  changeCustValues = e => {
	let data = this.state.customisationsAvailable;
	let targets = e.target.name.split(',')
	if (targets[1] === "addedPrice"){ data[targets[0]].addedPrice=e.target.value; }
	else if (targets[1] === "description"){ data[targets[0]].description=e.target.value; }
	else if (targets[1] === "name"){ data[targets[0]].name=e.target.value; }
	
	this.setState({ customisationsAvailable: data });
  }

  showCustomisations(){
	if (this.state.customisationsAvailable.length > 0){
	let codeSnippet = [<tr className="bg-red-900 text-white">
	  <td className="justify-start pb-2 text-lg font-semibold">Description of Customisation </td>
	  <td className="justify-start pb-2 text-lg font-semibold">Additional Cost of Customisation (£)</td>
	</tr>];
	const length = this.state.customisationsAvailable.length;
	for (var i = 0; i<length; i++){
	  codeSnippet.push(
	  	<tr>
          <td className="w-48 p-2 border-r border-gray-400">
		    <input
		      type="text"
		      name={[i,"description"]}
		      onChange={this.changeCustValues}
		      value={this.state.customisationsAvailable[i].description}
		      className="shadow w-48 border rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
		      disabled={this.state.disabled}
		    />
	      </td>
		  <td className="w-40 p-2 border-r border-gray-400">
              <input
                type={"number"}
                name={[i,"addedPrice"]}
                onChange={this.changeCustValues}
                value={this.state.customisationsAvailable[i].addedPrice}
                min="0"
                max="100"
                step="0.01"
                className="shadow w-40 border rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
                disabled={this.state.disabled}
              />
          </td>
		</tr>
	  );
	}
	return codeSnippet;}
	else{ return <></>}
  }

  getRemovalButtonCode(){
    return(
        <button
		  type="button"
          onClick={this.onRemove}
          disabled={this.state.disabled}
          className="px-2 py-1 rounded bg-red-900 text-white w-full font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
        >Remove Last Added Customisation</button>
	)
  }

  onRemove() {
	const customisations = this.state.customisationsAvailable;
	customisations.pop();
	this.setState({ customisationsAvailable: customisations });
  }

  addCustomisationOption(){
	const customisations = this.state.customisationsAvailable;
	customisations.push({ description: "", addedPrice: 0.00 });
	this.setState({ customisationsAvailable: customisations });
  }

  imageSelectedButtonText(){
	if (this.state.pictures.length > 0){
	  return "Change Image";
	}
	return "Select Image"
  }

  readyToUploadMessage(){
	if (this.state.pictures.length > 0){
	  let fileName = this.state.pictures[0].name.toString();
	  return fileName+" is ready to upload";
	}
	return ""
  }

  render () {
	return (
	  <React.Fragment>
		<form onSubmit={this.createNewItem}>
		  <fieldset>
			<div className="mx-auto w-max pb-4 border-b-2 border-red-900">
			  <label htmlFor="name" className="flex flex-row justify-start pb-2 text-lg font-semibold">Name</label>
			  <input
				type="text"
				name="name"
				onChange={this.onInputChange}
				value={this.state.name}
				className="shadow w-64 border rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
				disabled={this.state.disabled}
			  />
			</div>
			<div className="mx-auto w-max pb-4 border-b-2 border-red-900">
			  <label htmlFor="manufacturerCode" className="flex flex-row justify-start pb-2 text-lg font-semibold">Manufacturer Code</label>
			  <input
			    type="text"
				name="manufacturerCode"
				onChange={this.onInputChange}
				value={this.state.manufacturerCode}
				className="shadow w-64 border rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
				disabled={this.state.disabled}
			  />
			</div>
			<div className="mx-auto w-max pb-4 border-b-2 border-red-900">
			  <label htmlFor="description" className="flex flex-row justify-start pb-2 text-lg font-semibold">Description of Item</label>
			  <textarea
				name="description"
				onChange={this.onInputChange}
				value={this.state.description}
				className="shadow w-64 border rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
				disabled={this.state.disabled}
			  />
			</div>
			  <div className="mx-auto w-max pb-4 border-b-2 border-red-900">
			  	<label htmlFor="type" className="flex flex-row justify-start pb-2 text-lg font-semibold">Category</label>
				<select
				  name="type"
				  onChange={this.onInputChange}
				  value={this.state.type}
				  className="shadow w-64 border rounded p-1 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
				  disabled={this.state.disabled}
				>
				  <option value="hoodiesAndSweatshirts">Hoodies and Sweatshirts</option>
				  <option value="jacketsAndZips">Jackets and Zips</option>
				  <option value="shirts">Shirts</option>
				  <option value="sports">Joggers and Sports</option>
				  <option value="outdoors">The Greyt Outdoors</option>
				  <option value="accessories">Accessories</option>
				  <option value="other">Other</option>
				</select>
			  </div>
			  
			  <div className="mx-auto w-max pb-4 border-b-2 border-red-900">
			    <label htmlFor="price" className="flex flex-row justify-start pb-2 text-lg font-semibold">Base Price (£)</label>
				<input
				  type="number"
 				  name="price"
				  onChange={this.onInputChange}
			  	  value={this.state.price}
				  min="0"
				  max="100"
				  step="0.01"
				  className="shadow w-64 border rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50"
				  disabled={this.state.disabled}
				/>
			  </div>
			  <div className="mx-auto w-max pb-4 border-b-2 border-red-900">
				<label htmlFor="addNewCustomisation" className="flex flex-row justify-start pb-2 text-lg font-semibold">Available Customisations</label>
				<table className="mx-auto border-2 text-left border-red-900">
				  <tbody>
				  	{this.showCustomisations()}
				  </tbody>
			  	</table>
				<input
				  type="button"
				  value="addNewCustomisation"
				  disabled={this.state.disabled}
				  onClick={() => this.addCustomisationOption()}
				  className="my-1 px-4 py-1 rounded bg-red-900 text-white w-full font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
				  ></input>
				{ this.state.customisationsAvailable.length > 0 ? this.getRemovalButtonCode():<></> }
			  </div>

			  <div className="mx-auto w-max pb-4 border-b-2 border-red-900">
				<label htmlFor="sizes" className="flex flex-row justify-start pb-2 text-lg font-semibold">Available Sizes</label>
				<div name="sizes">
				  <table className="shadow w-64 border rounded p-1 focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-400 disabled:opacity-50">
					<thead><tr><th>XS</th><th>S</th><th>M</th><th>L</th><th>XL</th><th>XXL</th></tr></thead>
					<tbody><tr>
					  <td><input type="checkbox" name="XS" onChange={this.onInputChange} checked={this.state.XS} disabled={this.state.disabled}/></td>
					  <td><input type="checkbox" name="S" onChange={this.onInputChange} checked={this.state.S} disabled={this.state.disabled}/></td>
					  <td><input type="checkbox" name="M" onChange={this.onInputChange} checked={this.state.M} disabled={this.state.disabled}/></td>
					  <td><input type="checkbox" name="L" onChange={this.onInputChange} checked={this.state.L} disabled={this.state.disabled}/></td>
					  <td><input type="checkbox" name="XL" onChange={this.onInputChange} checked={this.state.XL} disabled={this.state.disabled}/></td>
					  <td><input type="checkbox" name="XXL" onChange={this.onInputChange} checked={this.state.XXL} disabled={this.state.disabled}/></td>
					</tr></tbody>
				  </table>
				</div>
			  </div>
			  <div className="mx-auto w-max pb-4 border-b-2 border-red-900">
				  <div className="shadow w-64 border rounded p-1 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50">
					<ImageUploader
					  fileContainerStyle={{padding: 0+"px", margin: 0+"px"}}
					  buttonStyles={{border: "1px solid #BE2B2E", color:"black", background: "transparent", margin: 3+"px "+0}}
					  withIcon={false}
					  withLabel={false}
					  withPreview={false}
					  buttonText={this.imageSelectedButtonText()}
					  onChange={this.onDrop}
					  imgExtension={['.jpg', '.gif', '.png']}
					  maxFileSize={2097152}
					  fileSizeError=" is larger than filesize limit (2MB)"
					  fileTypeError=" is not a supported file type: .jpg, .gif or .png"
					  singleImage={true /* not allowed to upload multiple, for now... */}
					/>
					{this.readyToUploadMessage()}
					<div className="px-4 py-1 rounded bg-red-900 text-white w-full font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50" style={{ width: this.state.progress, height: "2rem", padding: "2px" }}>
					   {this.state.progress}
					</div>
				  </div>
			  </div>
			  <div className="mx-auto w-64 pt-4 border-red-900">
				  Select Available Colours Below
				  <p></p>
				  <input
					type="submit"
					value="Create New Item"
					disabled={this.state.disabled}
					className="px-4 py-1 rounded bg-red-900 text-white w-full font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
				  />
			  </div>
			<div className="mx-auto pt-4 border-red-900">
			  <span className="w-full">New items are automatically marked available</span>
			</div>
		  </fieldset>
		</form>
	  </React.Fragment>
	)
  }
}

AddStock.propTypes = {
  updateStockListing: PropTypes.func.isRequired,
  selectedColours: PropTypes.object.isRequired,
  colours: PropTypes.array.isRequired
};

export default AddStock;
