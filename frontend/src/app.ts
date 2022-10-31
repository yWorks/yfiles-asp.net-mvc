import {
    Class,
    DefaultLabelStyle,
    GraphBuilder,
    GraphComponent,
    GraphViewerInputMode,
    HierarchicLayout,
    IGraph,
    INode,
    InteriorStretchLabelModel,
    LayoutExecutor,
    License,
    PolylineEdgeStyle,
    ShapeNodeStyle,
    Size
} from 'yfiles'

import LicenseContent from '../../license.json'

License.value = LicenseContent;

Class.ensure(LayoutExecutor)

let gc: GraphComponent;
let graph: IGraph;

type PersonHierarchy = {
    nodes: Person[]
    links: Link[]
}
type Person = {
    id: number
    firstName: string
    lastName: string
}
type PersonAddress = {
    addressLine: string,
    zip: string,
    city: string,
    country: string
}
type Link = {
    from: number
    to: number
}

(window as any).initializeGraph = async (selector: string) => {
    gc = new GraphComponent(selector);
    graph = gc.graph;

    // load the whole person hierarchy as JSON
    const jsonGraph = await load()
    buildGraph(graph, jsonGraph)

    // this enables selection of nodes
    gc.inputMode = new GraphViewerInputMode();

    // add a listener to detect selection and deselection of nodes
    gc.selection.addItemSelectionChangedListener((_, evt) => {
        if (evt.item instanceof INode) {
            if (evt.itemSelected) {
                // fetch information about person and update details panal
                updateDetails(evt.item.tag)
            } else {
                // reset and hide details panel
                updateDetailsPanel(null)
            }
        }
    })

    graph.applyLayout(new HierarchicLayout({ orthogonalRouting: true }))
    gc.fitGraphBounds()
}

(window as any).initializeGraph("#designDiv");

async function load(): Promise<PersonHierarchy> {
    const response = await fetch("API/GetHierarchy/0")
    return response.json()
}
function buildGraph(graph: IGraph, jsonGraph: PersonHierarchy) {
    // styling
    graph.nodeDefaults.size = new Size(75, 40)
    graph.nodeDefaults.style = new ShapeNodeStyle({
        fill: '#67b7dc',
        stroke: '#294958',
        shape: "round-rectangle"
    })
    graph.edgeDefaults.style = new PolylineEdgeStyle({
        stroke: '#294958',
        targetArrow: "#294958 medium triangle"
    })
    graph.nodeDefaults.labels.layoutParameter = InteriorStretchLabelModel.CENTER
    graph.nodeDefaults.labels.style = new DefaultLabelStyle({
        horizontalTextAlignment: "center",
        verticalTextAlignment: "center"
    })

    const builder = new GraphBuilder(graph)

    const nodesSource = builder.createNodesSource(jsonGraph.nodes, node => node.id)
    const nodeLabelsSource = nodesSource.nodeCreator.createLabelsSource(node => [node])
    nodeLabelsSource.labelCreator.textProvider = label => label.firstName + '\n' + label.lastName
    builder.createEdgesSource(jsonGraph.links, link => link.from, link => link.to);
    builder.buildGraph()
}

async function updateDetails(person: Person): Promise<void> {
    const id = person.id
    const [personData, addressData] = await Promise.all([
        fetch("API/GetPerson/" + id).then(resp => resp.json()),
        fetch("API/GetPersonAddress/" + id).then(resp => resp.json())
    ])
    updateDetailsPanel({person: personData, address: addressData})
}

function updateDetailsPanel(data: { person: Person, address: PersonAddress } | null): void {
    // update text in divs and show/hide the details panel by setting the css display property
    if (data === null) {
        document.getElementById("FirstName")!.innerText = ""
        document.getElementById("LastName")!.innerText = ""
        document.getElementById("Address")!.innerText = ""
        document.getElementById("City")!.innerText = ""
        document.getElementById("Zip")!.innerText = ""
        document.getElementById("Country")!.innerText = ""

        document.getElementById("detailsPanel")!.style.display = "none"
    } else {
        document.getElementById("FirstName")!.innerText = data.person.firstName
        document.getElementById("LastName")!.innerText = data.person.lastName
        document.getElementById("Address")!.innerText = data.address.addressLine
        document.getElementById("City")!.innerText = data.address.city
        document.getElementById("Zip")!.innerText = data.address.zip
        document.getElementById("Country")!.innerText = data.address.country

        document.getElementById("detailsPanel")!.style.display = "block"
    }
}
