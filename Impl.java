import java.rmi.*;
import java.rmi.server.*;
public class Impl extends UnicastRemoteObject implements AddInterface, SubInterface, MulInterface,DivInterface
{
// Default constructor to throw RemoteException
// from its parent constructor Impl() throws Exception { super(); }

// Implementation of the AddInterface,
// subInterface, MulInterface, and DivInterface public int add(int x, int y) { return x + y; } public int sub(int x, int y) { return x - y; } public int mul(int x, int y) { return x * y; } public int div(int x, int y) { return x / y; }
}
