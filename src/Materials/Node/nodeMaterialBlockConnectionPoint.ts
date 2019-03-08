import { NodeMaterialBlockConnectionPointTypes } from './nodeMaterialBlockConnectionPointTypes';
import { NodeMaterialBlockTargets } from './nodeMaterialBlockTargets';
import { Nullable } from '../../types';
import { Effect } from '../effect';
import { NodeMaterialWellKnownValues } from './nodeMaterialWellKnownValues';

declare type NodeMaterialBlock = import("./nodeMaterialBlock").NodeMaterialBlock;

/**
 * Defines a connection point for a block
 */
export class NodeMaterialConnectionPoint {
    private _ownerBlock: NodeMaterialBlock;
    private _connectedPoint: Nullable<NodeMaterialConnectionPoint>;
    private _associatedVariableName: string;
    private _endpoints = new Array<NodeMaterialConnectionPoint>();
    private _storedValue: any;
    private _valueCallback: () => any;
    private _isVarying = false;

    /** @hidden */
    public _wellKnownValue: Nullable<NodeMaterialWellKnownValues> = null;

    /**
     * Gets or sets the connection point type (default is float)
     */
    public type: NodeMaterialBlockConnectionPointTypes = NodeMaterialBlockConnectionPointTypes.Float;

    /**
     * Gets or sets the connection point name
     */
    public name: string;

    /**
     * Gets or sets a boolean indicating that this connection point can be omitted
     */
    public isOptional: boolean;

    /** Gets or sets the target of that connection point */
    public target: NodeMaterialBlockTargets = NodeMaterialBlockTargets.VertexAndFragment;

    /**
     * Gets or sets the value of that point.
     * Please note that this value will be ignored if valueCallback is defined
     */
    public get value(): any {
        return this._storedValue;
    }

    public set value(value: any) {
        this._storedValue = value;
        this.isUniform = true;
    }

    /**
     * Gets or sets a callback used to get the value of that point.
     * Please note that setting this value will force the connection point to ignore the value property
     */
    public get valueCallback(): () => any {
        return this._valueCallback;
    }

    public set valueCallback(value: () => any) {
        this._valueCallback = value;
        this.isUniform = true;
    }

    /**
     * Gets or sets the associated variable name in the shader
     */
    public get associatedVariableName(): string {
        if (!this._associatedVariableName && this._connectedPoint) {
            return this._connectedPoint.associatedVariableName;
        }

        return this._associatedVariableName;
    }

    public set associatedVariableName(value: string) {
        this._associatedVariableName = value;
    }

    /**
     * Gets or sets a boolean indicating that this connection point is coming from an uniform.
     * In this case the connection point name must be the name of the uniform to use.
     * Can only be set on inputs
     */
    public isUniform: boolean;

    /**
     * Gets or sets a boolean indicating that this connection point is coming from an attribute.
     * In this case the connection point name must be the name of the attribute to use
     * Can only be set on inputs
     */
    public isAttribute: boolean;

    /**
     * Gets or sets a boolean indicating that this connection point is generating a varying variable.
     * Can only be set on exit points
     */
    public get isVarying(): boolean {
        for (var connectedBlock of this.connectedBlocks) {
            if (connectedBlock.target && this.ownerBlock.target && (connectedBlock.target & this.ownerBlock.target) === 0) {
                return true;
            }
        }

        return this._isVarying;
    }

    public set isVarying(value: boolean) {
        this._isVarying = value;
    }

    /** Get the other side of the connection (if any) */
    public get connectedPoint(): Nullable<NodeMaterialConnectionPoint> {
        return this._connectedPoint;
    }

    /** Get the block that owns this connection point */
    public get ownerBlock(): NodeMaterialBlock {
        return this._ownerBlock;
    }

    /** Get the block connected on the other side of this connection (if any) */
    public get sourceBlock(): Nullable<NodeMaterialBlock> {
        if (!this._connectedPoint) {
            return null;
        }

        return this._connectedPoint.ownerBlock;
    }

    /** Get the block connected on the endpoints of this connection (if any) */
    public get connectedBlocks(): Array<NodeMaterialBlock> {
        if (this._endpoints.length === 0) {
            return [];
        }

        return this._endpoints.map((e) => e.ownerBlock);
    }

    /**
     * Creates a new connection point
     * @param name defines the connection point name
     * @param ownerBlock defines the block hosting this connection point
     */
    public constructor(name: string, ownerBlock: NodeMaterialBlock) {
        this._ownerBlock = ownerBlock;
        this.name = name;
    }

    /**
     * Gets the current class name e.g. "NodeMaterialConnectionPoint"
     * @returns the class name
     */
    public getClassName(): string {
        return "NodeMaterialConnectionPoint";
    }

    /**
     * Set the source of this connection point to a vertex attribute
     * @param attributeName defines the attribute name (position, uv, normal, etc...)
     * @returns the current connection point
     */
    public setAsAttribute(attributeName: string): NodeMaterialConnectionPoint {
        this.name = attributeName;
        this.isAttribute = true;
        return this;
    }

    /**
     * Set the source of this connection point to a well known value
     * @param value define the well known value to use (world, view, etc...)
     * @returns the current connection point
     */
    public setAsWellKnownValue(value: NodeMaterialWellKnownValues): NodeMaterialConnectionPoint {
        switch (value) {
            case NodeMaterialWellKnownValues.World:
                this.name = "world";
                break;
            case NodeMaterialWellKnownValues.View:
                this.name = "view";
                break;
            case NodeMaterialWellKnownValues.Projection:
                this.name = "projection";
                break;
            case NodeMaterialWellKnownValues.WorldView:
                this.name = "worldView";
                break;
            case NodeMaterialWellKnownValues.WorldViewProjection:
                this.name = "worldViewProjection";
                break;
            case NodeMaterialWellKnownValues.ViewProjection:
                this.name = "viewProjection";
                break;
            case NodeMaterialWellKnownValues.FogColor:
                this.name = "fogColor";
                break;
            case NodeMaterialWellKnownValues.FogParameters:
                this.name = "fogParameters";
                break;
        }
        this.isUniform = true;
        this._wellKnownValue = value;
        return this;
    }

    /**
     * Connect this point to another connection point
     * @param connectionPoint defines the other connection point
     * @returns the current connection point
     */
    public connectTo(connectionPoint: NodeMaterialConnectionPoint): NodeMaterialConnectionPoint {
        if ((this.type & connectionPoint.type) === 0) {
            throw "Cannot connect two different connection types.";
        }

        this._endpoints.push(connectionPoint);
        connectionPoint._connectedPoint = this;
        return this;
    }

    /**
     * Disconnect this point from one of his endpoint
     * @param endpoint defines the other connection point
     * @returns the current connection point
     */
    public disconnectFrom(endpoint: NodeMaterialConnectionPoint): NodeMaterialConnectionPoint {
        let index = this._endpoints.indexOf(endpoint);

        if (index === -1) {
            return this;
        }

        this._endpoints.splice(index, 1);
        endpoint._connectedPoint = null;
        return this;
    }

    /**
     * When connection point is an uniform, this function will send its value to the effect
     * @param effect defines the effect to transmit value to
     */
    public transmit(effect: Effect) {
        let value = this._valueCallback ? this._valueCallback() : this._storedValue;

        switch (this.type) {
            case NodeMaterialBlockConnectionPointTypes.Float:
                effect.setFloat(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Int:
                effect.setInt(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Color3:
                effect.setColor3(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Color4:
                effect.setDirectColor4(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Vector2:
                effect.setVector2(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Vector3:
                effect.setVector3(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Vector4:
                effect.setVector4(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Matrix:
                effect.setMatrix(this.name, value);
                break;
            case NodeMaterialBlockConnectionPointTypes.Texture:
                effect.setTexture(this.name, value);
                break;
        }
    }
}