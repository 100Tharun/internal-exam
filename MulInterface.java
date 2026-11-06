import java.rmi.Remote;
import java.rmi.RemoteException;

public interface MulInterface extends Remote {
public int mul(int x, int y) throws RemoteException;
}